import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let accounts;
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let TEST_ORACLES_COUNT = 60;
var respProb = [20, 20, 20, 20, 20, 20, 20, 20, 10, 10];
var oracles = [];
let fee = 10e17

const getRandomInt = () => {
  return Math.floor(Math.random() * Math.floor(respProb.length));
}

const setUp = async () => {
  accounts = await web3.eth.getAccounts();
  for(let a=30; a<TEST_ORACLES_COUNT; a++) {      
    await flightSuretyApp.methods.registerOracle().send({ from: accounts[a], value: fee, gas: 5500000 });
    let result = await flightSuretyApp.methods.getMyIndexes().call({from: accounts[a]});
    oracles.push({
      address: accounts[a],
      index: result
    });
    console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
  }
};

const oraclesResp = async (_emitedIdx) => {
  
  var acceptedOracles = [];
  let emitedIdx = parseInt(_emitedIdx.index)
  let flight = _emitedIdx.flight
  let airline = _emitedIdx.airline
  let timestamp = _emitedIdx.timestamp
  oracles.forEach(oracle => {
    let i0 = parseInt(oracle.index[0])
    let i1 = parseInt(oracle.index[1])
    let i2 = parseInt(oracle.index[2])
    if(i0 === emitedIdx) {
      oracle.idx = i0
      acceptedOracles.push(oracle)
    } 
    else if(i1 === emitedIdx) {
      oracle.idx = i1
      acceptedOracles.push(oracle)
    } 
    else if(i2 === emitedIdx) {
      oracle.idx = i2
      acceptedOracles.push(oracle)
    }
  })

  for(let i=0; i < acceptedOracles.length; i++) {

    let radIdx = getRandomInt()
    try {
      await flightSuretyApp.methods.submitOracleResponse(
        acceptedOracles[i].idx,
        airline, 
        flight,
        parseInt(timestamp), 
        respProb[radIdx]).send( {from: acceptedOracles[i].address, gas: 5500000} );
        console.log(i, "success", acceptedOracles[i].idx, respProb[radIdx], acceptedOracles[i].index, acceptedOracles[i].address, )
    } catch(err) {console.log(i, "error", acceptedOracles[i].idx, respProb[radIdx], acceptedOracles[i].index, acceptedOracles[i].address, )}
    setTimeout(() =>{}, 2000)
  }
};

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
    if (error) {
      console.log(error)
    } else {
      oraclesResp(event.returnValues, respProb)
    }
});

flightSuretyApp.events.FlightStatusInfo({
  fromBlock: 0
}, function (error, event) {
  if (error) {
    console.log(error)
  } else {
    console.log("flightinfo was emitted")
  }
});


setUp();

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


