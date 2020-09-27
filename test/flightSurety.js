
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
const truffleAssert = require('truffle-assertions');

let accounts;

contract('Flight Surety Tests', async (accnts) => {
    accounts = accnts;
});

var config;
before('setup contract', async () => {
config = await Test.Config(accounts);
await config.flightSuretyData.authorizeCaller("0x04ab41d3d5147c5d2BdC3BcFC5e62539fd7e428B");
});



it(`(multiparty) has correct initial isOperational() value`, async function () {
let status = await config.flightSuretyData.isOperational.call();
assert.equal(status, true, "Incorrect initial operating status value");
});

it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

    let accessDenied = false;
    try {
        await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    }
    catch(e) {
        accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
        
});

it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {


    let accessDenied = false;
    try 
    {
        await config.flightSuretyData.setOperatingStatus(false);
    }
    catch(e) {
        accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
    
});

it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

    await config.flightSuretyData.setOperatingStatus(false);
    let reverted = false;
    try 
    {
        await config.flightSurety.setTestingMode(true);
    }
    catch(e) {
        reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");      
    await config.flightSuretyData.setOperatingStatus(true);
});

it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

    let newAirline = accounts[1];
    
    await config.flightSuretyApp.registerAirline(newAirline, "aeromexico", {from: config.owner});
    //let h =  await config.flightSuretyApp.stakeForVotingRights({from: newAirline, value:10*config.weiMultiple});
    let result = await config.flightSuretyData.isAirline.call(newAirline);
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
});

it('Airline 1 can be the only one to aprove and register other airlines 2, 3 and 4', async () => {

    let airline1 = accounts[1];
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];

    await config.flightSuretyApp.registerAirline(airline2, "JFK", {from: airline1});
    await config.flightSuretyApp.registerAirline(airline3, "Iberica", {from: airline1});
    await config.flightSuretyApp.registerAirline(airline4, "HK", {from: airline1});

    let airlinePos1 = new BigNumber(await config.flightSuretyData.getAirlinePosition.call(airline1));
    let airlinePos2 = new BigNumber(await config.flightSuretyData.getAirlinePosition.call(airline2));
    let airlinePos3 = new BigNumber(await config.flightSuretyData.getAirlinePosition.call(airline3));
    let airlinePos4 = new BigNumber(await config.flightSuretyData.getAirlinePosition.call(airline4));


    assert.equal(
        airlinePos1.toNumber() === 1 &&
        airlinePos2.toNumber() === 2 &&
        airlinePos3.toNumber() === 3 &&
        airlinePos4.toNumber() === 4,
        true, "Airine should not be able to register another airline if it hasn't provided funding");
})

it('Airline can vote once it has staked 10 Ethers', async () => {

    let airline1 = accounts[1];
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];

    await config.flightSuretyApp.stakeForVotingRights({from: airline1, value: 10*config.weiMultiple})
    await config.flightSuretyApp.stakeForVotingRights({from: airline2, value: 10*config.weiMultiple})
    await config.flightSuretyApp.stakeForVotingRights({from: airline3, value: 10*config.weiMultiple})
    await config.flightSuretyApp.stakeForVotingRights({from: airline4, value: 10*config.weiMultiple})

    assert.equal(
        await config.flightSuretyData.isAirline.call(airline1) &&
        await config.flightSuretyData.isAirline.call(airline2) &&
        await config.flightSuretyData.isAirline.call(airline3) &&
        await config.flightSuretyData.isAirline.call(airline4),
        true, "Airine should not be able to register another airline if it hasn't provided funding");
})

it('Airline num 5 can be registered once airlines has voted for that airline', async () => {

    let airline1 = accounts[1];
    let airline2 = accounts[2];
    let airline3 = accounts[3];
    let airline4 = accounts[4];
    let airlineToRegister = accounts[5];

    await config.flightSuretyApp.voteAirline(airlineToRegister, {from: airline1})
    await config.flightSuretyApp.voteAirline(airlineToRegister, {from: airline2})
    await config.flightSuretyApp.voteAirline(airlineToRegister, {from: airline3})
    await config.flightSuretyApp.voteAirline(airlineToRegister, {from: airline4})

    await config.flightSuretyApp.registerAirline(airlineToRegister, "TurkeyAirlines", {from:airlineToRegister})
    let airlinePos5 = new BigNumber(await config.flightSuretyData.getAirlinePosition.call(airlineToRegister));

    assert.equal(
        airlinePos5.toNumber() === 5
        ,true, "Airine should not be able to register another airline if it hasn't provided funding");
})

it('Flight should be registered by last registered airline', async () => {

    let key;
    let airlineToRegister = accounts[4];
    let flight = {
        flight: "FMTH-1025",
        airline: airlineToRegister,
        timestamp: Math.floor(Date.now() / 1000)
    }
    
    let _flight = await config.flightSuretyApp.registerFlight(
            flight.airline, flight.flight, 
            flight.timestamp, {from: flight.airline}
        )
    
    truffleAssert.eventEmitted(_flight, "FlightRegistered", (ev) =>{
        key = ev._key;
        return ev._name === flight.flight
    })

    let registeredFlight =await config.flightSuretyData.getFlight.call(web3.utils.hexToBytes(key))

    assert.equal(
        registeredFlight === flight.flight,
        true, "Airine should not be able to register another airline if it hasn't provided funding");
})

it('Passenger can buy insurance for registered flight', async () => {

    let _flight;
    let passenger = accounts[10];
    let flight = {
        flight: "FMTH-1025",
    }
    
    let insurance = await config.flightSuretyApp.buyInsurance(flight.flight, {from: passenger, value: 1*config.weiMultiple})
    
    truffleAssert.eventEmitted(insurance, "UserBoughtInsurance", (ev) =>{
        _flight = ev.flight;
        return _flight === flight.flight
    })

    let userHasInsurancePolicy = await config.flightSuretyData.haveInsurance.call(passenger)
    assert.equal(
        !userHasInsurancePolicy,
        true, "Airine should not be able to register another airline if it hasn't provided funding");
})

it('Passenger can request a payout', async () => {

    let passenger = accounts[10];
    let flight = {
        flight: "FMTH-1025",
    }    
    let payout = await config.flightSuretyApp.getInsurancePayout({from: passenger})
    
    truffleAssert.eventEmitted(payout, "UserRequestedPayout", (ev) =>{
        return ev.passenger === passenger
    })

    let hasRequestedPayout = await config.flightSuretyData.askedForWithdraw.call(passenger)

    assert.equal(
        hasRequestedPayout,
        true, "Airine should not be able to register another airline if it hasn't provided funding");
})

