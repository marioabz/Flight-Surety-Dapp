const Test = require('../config/testConfig.js');
const truffleAssert = require('truffle-assertions');

let accounts;
let oracles = [];
let emitedIdx;
let acceptedOracles = [];
var sor;

// Watch contract events
const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

const TEST_ORACLES_COUNT = 20;
var config;


contract('Oracles', async (accnts) => {
  accounts = accnts;
});

before(async () => {
  config = await Test.Config(accounts);
});

  it('can register oracles', async () => {
    
    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for(let a=1; a<TEST_ORACLES_COUNT; a++) {      
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes({from: accounts[a]});
      oracles.push({
        address: accounts[a],
        index: result
      });
      console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {
    
    let flight = 'ND1309'; // Course number
    let timestamp = Math.floor(Date.now() / 1000);

    // Submit a request for oracles to get status information for a flight
    const resp = await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, timestamp);
    // ACT

    truffleAssert.eventEmitted(resp, "OracleRequest", (event) => {
      console.log("Oracle Request Event was emitted")
      emitedIdx = event.index
      return event.flight === flight
    })

    oracles.forEach(oracle => {

      if(oracle.index[0].toNumber() === emitedIdx.toNumber()) {
        oracle.idx = oracle.index[0].toNumber()
        acceptedOracles.push(oracle)
      } 
      else if(oracle.index[1].toNumber() === emitedIdx.toNumber()) {
        oracle.idx = oracle.index[1].toNumber()
        acceptedOracles.push(oracle)
      } 
      else if(oracle.index[2].toNumber() === emitedIdx.toNumber()) {
        oracle.idx = oracle.index[2].toNumber()
        acceptedOracles.push(oracle)
      }
    })

    console.log(`Lenght of oracles responses is: ${acceptedOracles.length} \n`)

    for(let i=0; i < acceptedOracles.length; i++) {

      sor = await config.flightSuretyApp.submitOracleResponse(
          acceptedOracles[i].idx, 
          config.firstAirline, 
          flight, timestamp, 
          STATUS_CODE_ON_TIME, 
          {from: acceptedOracles[i].address}
        );
      
      if(i > 2) {
        truffleAssert.eventEmitted(sor, "FlightStatusInfo", (event) => {
          return event.airline === config.firstAirline
        })
      }

      setTimeout(() =>{}, 300)
    }
  });