pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions 

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint8 private constant REINVURSEMENT_FACTOR = 15;

    address private contractOwner;          // Account used to deploy contract

    FlightSuretyData FSD;
    address public FSDaddress;

    event AirlineRegistered(address _airline, address register);
    event AirlinesHasStaked(address _airline);
    event AirlineHasVoted(address _airline);
    event FlightRegistered(address _airline, string _name, bytes32 _key);

    modifier requireIsOperational() {
        require(true, "Contract is currently not operational");  
        _;  
    }

    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    constructor(address eternalStorageUnit) public {
        contractOwner = msg.sender;
        FSDaddress = eternalStorageUnit;
        FSD = FlightSuretyData(eternalStorageUnit);
    }

    modifier IsAirline() {
        require(FSD.isAirline(msg.sender), "Airline not allowed or doesn't exist");
        _;
    }

    modifier hasVoted() {
        require(FSD.canAirlineVote(msg.sender), "This airline has already voted");
        _;
    }

    modifier airlineIsAllowed() {
        require(FSD.IsAirlineAllowed(msg.sender), "This airline is not allowed to vote");
        _;
    }

    modifier capFlight() {
        require(msg.value <= 1 ether, 
        "1 Ether is the max amount of Ether you pay for a flight");
        _;
    }

    function isOperational()public pure returns(bool) {
        return true;  // Modify to call data contract's status
    }
  

    /*                  Airlines functions              */

   // Add an airline to the registration queue
    function registerAirline(address _airline, string _name) external {

        uint noRegisteredAirlines = FSD.getNoRegisteredAirlines();
        uint requiredApprovals = noRegisteredAirlines / 2;

        if(noRegisteredAirlines == 0) {
            require(msg.sender == contractOwner, "Caller is not contract owner");
        }
        else if(noRegisteredAirlines > 0 && noRegisteredAirlines < 4) {
            require(FSD.getAirlinePosition(msg.sender) == 1,
            "Airlines from 1 to 4 had to be registered from airline1");
        }
        else if(FSD.getVotesLength() >= requiredApprovals) {
            FSD.cleanVotes();
        }
        else {
            revert("Insufficient amount of votes");
        }
        FSD.registerAirline(_airline, _name);
    }

    function voteAirline(address _airline) external hasVoted airlineIsAllowed {
        FSD.voteAirline(msg.sender);
        emit AirlineHasVoted(_airline);
    }

    function stakeForVotingRights() external payable {
        
        require(msg.value == 10 ether, "Payment of 10 ether is required");
        FSDaddress.transfer(msg.value);
        FSD.allowAfterStake(msg.sender);
        emit AirlinesHasStaked(msg.sender);
    }


    /*                          Passenger functions                         */

    modifier haveInsurance() {
        require(FSD.haveInsurance(msg.sender), "This user already has an insurance policy");
        _;
    }

    modifier askedForWithdraw() {
        require(FSD.askedForWithdraw(msg.sender), "User has to request a withdrawal");
        _;
    }

    function buyInsurance(string flight) external payable capFlight haveInsurance {

        // Creates Insurance register for users
        FSDaddress.transfer(msg.value);
        FSD.buyInsurance(flight, msg.sender, msg.value);
    }

    function getInsurancePayout() external {

        require(!FSD.haveInsurance(msg.sender), "User must be registered");
        //Credit balance to struct in mapping;
        FSD.getInsurancePayout(msg.sender, REINVURSEMENT_FACTOR);
    }

    function withdrawPayout() external askedForWithdraw {

        //Transfer Payout to user
        FSD.withdrawPayout(msg.sender);
    }


    /*                  Flights functions                   */
       //Register a future flight for insuring.
    function registerFlight(address _airline, string _flight, uint256 timestamp) 
    external IsAirline returns(bytes32){
        
        bytes32 key = getFlightKey(_airline, _flight, timestamp);
        require(!FSD.isFlightRegistered(key), "This flight already exists");
        FSD.addFlight(_flight, _airline, timestamp);
        emit FlightRegistered(_airline, _flight, key);
    }
    
   // Called after oracle has updated flight status
    function processFlightStatus(
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode) 
        internal {
        
            FSD.setFlighStatusCode(statusCode);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus(
        address airline,
        string flight,
        uint256 timestamp) external {

        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
            requester: msg.sender,
            isOpen: true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    function getFlight(address _airline, string _flight, uint _timestamp) external view returns(string){
        
        bytes32 key = getFlightKey(_airline, _flight, _timestamp);
        return FSD.getFlight(key);
    }

// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;

    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);

    // Register an oracle with the contract
    function registerOracle() external payable {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
            isRegistered: true,
            indexes: indexes
        });
    }

    function getMyIndexes() view external returns(uint8[3]) {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse(
        uint8 index,
        address airline,
        string flight,
        uint256 timestamp,
        uint8 statusCode
        ) external {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");

        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);

        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
        ) pure internal returns(bytes32) {

        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes(address account) internal returns(uint8[3]) {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex(address account) internal returns (uint8) {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }
// endregion
}   

contract FlightSuretyData {

    function cleanVotes() external view;
    function creditInsurees() external view;
    function withdrawPayout(address user) external;
    function getFlight(bytes32 _key) external view returns(string);
    function voteAirline(address _airline) external view;
    function setFlighStatusCode(uint8 statusCode) external;
    function getVotesLength() external view returns (uint);
    function allowAfterStake(address airline) external view;
    function getNoRegisteredAirlines() external view returns(uint8);
    function getInsurancePayout(address user, uint8 factor) external;
    function isAirline(address airline) external view returns (bool);
    function haveInsurance(address user) external view returns(bool);
    function registerAirline(address _airline, string _name) external;
    function askedForWithdraw(address user) external view returns(bool);
    function canAirlineVote(address airline) external view returns(bool);
    function isFlightRegistered(bytes32 _key) external view returns(bool);
    function IsAirlineAllowed(address airline) external view returns(bool);
    function buyInsurance(string flight, address user, uint amount) external;
    function getAirlinePosition(address airline) external view returns(uint8);
    function addFlight(string flight, address airline, uint256 timestamp) external;
}
