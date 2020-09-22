
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

let flights = ["FNTH-1002", "FBTM-8461", "FSTM-7059"];


let statusCodeProb = [0,20,20,20,0,20,20,20,20,0];
(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });

        let flightsDisplayer = DOM.elid("flights-displayer");
        flightsDisplayer.appendChild(DOM.div({className: "flight-title"}, "Scheduled Flights"));
        flights.map(flight => {
        flightsDisplayer.appendChild(DOM.div({className: 'flight'}, flight));
        })
    
        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('flights-displayer').addEventListener('click', (res) => {
            DOM.elid('flight-number').value = res.toElement.innerText;
        })
    });
    
})();

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

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







