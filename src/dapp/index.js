
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

let flights = [

    {flight: "FNTH-1002", timestamp: Math.floor(Date.now() / 1000)}, 
    {flight: "FBTM-8461", timestamp: Math.floor(Date.now() / 1000)}, 
    {flight: "FSTM-7059", timestamp: Math.floor(Date.now() / 1000)}
];

let counter = 27;

let statusCodeProb = [0,20,20,20,0,20,20,20,20,0];
(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        contract.getAccounts(accnts => {

            flights.map((flight, idx) => {
                flight.airline = accnts[counter + idx];
                console.log(flight)
            })
        });

        // Read transaction
        contract.isOperational((error, result) => {
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        let flightsDisplayer = DOM.elid("flights-displayer");
        flightsDisplayer.appendChild(DOM.div({className: "flight-title"}, "Scheduled Flights"));
        
        flights.map(flight => {
            flightsDisplayer.appendChild(DOM.div({className: 'flight'}, flight.flight))
        });
    
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                console.log(result)
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('flights-displayer').addEventListener('click', (res) => {
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







