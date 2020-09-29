
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        let flights = [
            {flight: "FNTH-1002", timestamp: Math.floor(Date.now() / 1000)}, 
            {flight: "FBTM-8461", timestamp: Math.floor(Date.now() / 1000)}, 
            {flight: "FSTM-7059", timestamp: Math.floor(Date.now() / 1000)}
        ];

        contract.getAccounts(accnts => {

            flights.map(flight => {
                flight.airline = contract.airlines[0];
            })
        });

        let airline = {
            name: "Aeromexico",
            owner: contract.owner,
            airline: contract.airlines[0],
        }

        let airlineEl = DOM.elid("the-airline");
        airlineEl.appendChild(DOM.p(contract.airlines[0]))

        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        let flightsDisplayer = DOM.elid("flights-displayer");
        flightsDisplayer.appendChild(DOM.div({className: "flight-title"}, "Scheduled Flights"));
        
        flights.map(flight => {
            flightsDisplayer.appendChild(DOM.p({className: 'flight'}, flight.flight))
        });

        DOM.elid('register-airline').addEventListener('click', () => {
            contract.registerAirline(airline, (err, res) => {
                console.log(err, "Transaction hash is: " + res)
            })
        })

        DOM.elid('stake10').addEventListener('click', () => {
            contract.stakeForVotingRights(contract.airlines[0], (err, res) => {
                console.log(err, "Transaction hash is: " + res)
            })
        })

        DOM.elid('register-flights').addEventListener('click', () => {
            flights.forEach(flight => {
                contract.registerFlight(flight, (err, res) => {
                    console.log(err, "Transaction hash is: "+ res)
                })
            })
        })

        DOM.elid('flights-displayer').addEventListener('click', (res) => {
            DOM.elid('flight-number').value = res.toElement.innerText;
        })
    
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let ctr = 0;
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                console.log(result)
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp } ]);
            });
            contract.flightInfo().on("data", (tr) => {
                
                console.log(ctr)
                if(parseInt(tr.returnValues.status) === 20 && ctr > 2) {
                    DOM.elid('buy-insurance').disabled = false
                    DOM.elid('buy-insurance').style.backgroundColor = "#019e3d"
                    console.log("Flight was delayed")
                }
                ctr++;
            })
        })

        DOM.elid('buy-insurance').addEventListener('click', (res) => {
            DOM.elid('flight-number').value = res.toElement.innerText;
        })
    });
})();


function display(title, description, results) {

    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className: 'key-field'}));
        row.appendChild(DOM.div({className: 'key'}, result.label + ":"));
        row.appendChild(DOM.div({className: 'field'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}







