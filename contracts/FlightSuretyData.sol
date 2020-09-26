pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    
    using SafeMath for uint256;

    // Operations variables
    address private contractOwner; // Account used to deploy contract
    bool private operational = true; // Blocks all state changes throughout the contract if false
    mapping(address => bool) authCallers;

    // Airlines variables
    struct Airline {
        string name;
        bool allowed;
        bool canVote;
        address airlineAddress;
        uint8 position;
    }
    uint8 noRegisteredAirlines;
    mapping(address => Airline) public airlines;

    // Array to count votes and keep track of addresses
    address[] votes;

    // Flight variables
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        string flight;
    }
    mapping(bytes32 => Flight) private flights;

    struct Insured {
        string flight;
        uint paidAmount;
        uint debt;
        bool requestForPayout;
        address user;
    }
    mapping(address => Insured) policyHolders;
    
    
    constructor() public {
        contractOwner = msg.sender;
        noRegisteredAirlines = 0;
    }
    bytes32 key;

    // Modifier that requires the "operational" boolean variable to be "true"
    modifier requireIsOperational() {
        require(operational, "Contract is currently not operational");
        _; 
    }

    function authorizeCaller(address newCaller) external requireContractOwner requireIsOperational{

        authCallers[newCaller] = true;
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


    /*                      Airlines functions                   */
    function isFlightRegistered(bytes32 _key) external view returns(bool) {
        return flights[_key].isRegistered;
    }

    function getVotesLength() external view returns (uint){
        return votes.length;
    }

    function isAirline(address airline) external view returns (bool){
        return airlines[airline].allowed && airlines[airline].canVote;
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

    function setFlighStatusCode(uint8 statusCode) external {

        flights[key].statusCode = statusCode;
    }

    /*                  Flights functions                   */

    function addFlight(string flight, address airline, uint256 timestamp) external {
        bytes32 _key = getFlightKey(airline, flight, timestamp);
        flights[_key] = Flight(true, 0, timestamp, airline, flight);
    }

    function getFlight(bytes32 _key) external view returns(string){

        return flights[_key].flight;
    }

    function getFlightKey(
        address airline,
        string flight,
        uint256 timestamp
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /*                      Buy insurance for a flight                      */
    function haveInsurance(address user) external view returns(bool){
        // if true address does exist, false otherwise
        return policyHolders[user].user == address(0);
    }

    function buyInsurance(string flight, address user, uint amount) external {
        // Apply modifier
        policyHolders[user] = Insured(flight, amount, 0, false, user);
    }

    function getInsurancePayout(address user, uint8 factor) external {
        // Apply modifier
        policyHolders[user].debt = policyHolders[user].paidAmount * factor / 10;
        policyHolders[user].requestForPayout = true;
    }

    function withdrawPayout(address user) external {

        policyHolders[user].paidAmount = 0;
        uint toSend = policyHolders[user].debt;
        policyHolders[user].debt = 0;
        policyHolders[user].requestForPayout = false;

        user.transfer(toSend);
    }

    function askedForWithdraw(address user) external view returns(bool) {
        return policyHolders[user].requestForPayout;
    }
    

    //Fallback function for funding smart contract.
    function() external payable {
    }
}
