import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.web3ws = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.FSAws = new this.web3ws.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
           
            this.owner = accts[0];
            let counter = 1;

            while(this.airlines.length < 15) {
                this.airlines.push(accts[counter++]);
            }
            
            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    getAccounts(callback) {
        this.web3.eth.getAccounts((error, accts) => callback(accts));
    }

    isOperational(callback) {
        
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner}, (error, result) => {
                callback(error, payload);
            });
    }

    registerFlight(payload, callback) {
        let self = this;
        self.flightSuretyApp.methods
        .registerFlight(payload.airline, payload.flight, payload.timestamp)
        .send({ from: payload.airline, gas: 5500000}, (error, result) => {
            callback(error, result);
        });
    }

    registerAirline(payload, callback) {
        let self = this;
        self.flightSuretyApp.methods
        .registerAirline(payload.airline, payload.name)
        .send({ from: payload.owner,  gas: 5500000}, (error, result) => {
            callback(error, result);
        })
    }

    stakeForVotingRights(_owner, callback) {
        let self = this;
        self.flightSuretyApp.methods
        .stakeForVotingRights()
        .send({ from: _owner, value:10e18, gas: 5500000}, (error, result) => {
            callback(error, result);
        })
    }

    flightInfo() {
        let self = this;
        return self.FSAws.events.FlightStatusInfo({fromBlock: 0})
    }

}