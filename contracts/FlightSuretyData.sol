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

    struct Votes {
        address airline;
        bool vote;
    }
    Votes[] votes;

    uint8 noRegisteredAirlines;
    uint8 approvedAirlines; //Votes by airlines

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
        approvedAirlines = 0;
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

    modifier requireFirstAirlineApproval() {
        if(noRegisteredAirlines > 0 && noRegisteredAirlines < 4) {
            require(airlines[msg.sender].position == 1);
        }
        _;
    }

    modifier airlineIsAllowed() {
        require(airlines[msg.sender].allowed, "This airline is not allowed to vote");
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

    function _registerAirline(string memory _name) internal pure {
        noRegisteredAirlines++;
        airlines[_airline] = Airline(_name, false, false, msg.sender, noRegisteredAirlines);
    }

    //Add an airline to the registration queue. Can only be called from FlightSuretyApp contract
    function registerAirline(string calldata _name) external pure{
        
        if(noRegisteredAirlines > 0 && noRegisteredAirlines < 4) {
            require(airlines[msg.sender].position == 1);
        }
        uint8 requiredApprovals = noRegisteredAirlines / 2;
        if(votes.length >= requiredApprovals) {
            cleanVotes();
            delete votes;
            _registerAirline(_name);
        }

    }

    function cleanVotes() internal pure {
        for(uint i; i < votes.length;  i++) {
            airlines[votes[i].airline].canVote = true;
        }
    }

    function voteAirline() external pure {
    }

    //uy insurance for a flight
    function buy() external payable {}

    //Credits payouts to insurees
    function creditInsurees() external pure {}

    // Transfers eligible payout funds to insuree
    function pay() external pure {}

    // Initial funding for the insurance. Unless there are too many delayed flights
    // resulting in insurance payouts, the contract should be self-sustaining

    function fund() public payable {}

    function getFlightKey(
        address airline,
        string memory flight,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    //Fallback function for funding smart contract.
    function() external payable {
        fund();
    }
}
