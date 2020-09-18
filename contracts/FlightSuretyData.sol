pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    
    using SafeMath for uint256;

    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false

    struct Airline {
        string name;
        bool allowed;
        bool canVote;
        address airlineAddress;
        uint8 position;
    }
    address[] votes;
    uint8 noRegisteredAirlines;

    mapping(address => Airline) public airlines;

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    mapping(bytes32 => Flight) private flights;
    mapping (address => bool) authAddresses;
    mapping(address => uint) debtUsers;
    
    
    constructor() public {
        contractOwner = msg.sender;
        noRegisteredAirlines = 0;
    }

    // Modifier that requires the "operational" boolean variable to be "true"
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; 
    }

    modifier requireContractOwner() {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    //Get operating status of contract
    function isOperational() public view returns (bool) {
        return operational;
    }

    // When operational mode is disabled, all write transactions except for this one will fail
    function setOperatingStatus(bool mode) external requireContractOwner {
        operational = mode;
    }


    /*          Airlines functions       */

    function getVotesLength() external view returns (uint){
        return votes.length;
    }

    function allowAfterStake(address airline) external {
        airlines[airline].allowed = true;
        airlines[airline].canVote = true;
    }

    function voteAirline(address airline) external {
        votes.push(airline);
        airlines[airline].canVote = false;
    }

    function IsAirlineAllowed(address airline) external view returns(bool) {
        return airlines[airline].allowed;
    }

    function canAirlineVote(address airline) external view returns(bool) {
        return airlines[airline].canVote;
    }

    function getNoRegisteredAirlines() external view returns(uint8) {
        return noRegisteredAirlines;
    }

    function getAirlinePosition(address airline) external view returns(uint8) {
        return airlines[airline].position;
    }

    function registerAirline(address _airline, string _name) external {
        noRegisteredAirlines++;
        airlines[_airline] = Airline(_name, false, false, _airline, noRegisteredAirlines);
    }

    function cleanVotes() external {
        for(uint i; i < votes.length;  i++) {
            airlines[votes[i]].canVote = true;
        }
        delete votes;
    }

    //Buy insurance for a flight
    function buy() external payable {}

    //Credits payouts to insurees
    function creditInsurees() external view {}

    // Transfers eligible payout funds to insuree
    function pay() external view {}

    // Initial funding for the insurance. Unless there are too many delayed flights
    // resulting in insurance payouts, the contract should be self-sustaining

    function fund() public payable {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    //Fallback function for funding smart contract.
    function() external payable {
        fund();
    }
}
