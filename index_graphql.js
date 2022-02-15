const { createSubscriptionObservable } = require ('./lib/graphql');
const { parseLogData } = require ('./lib/parseEvent');
const { clients } = require ('./constants');

const createSubscriptionClient = (network, cb) => {
    const { wsurl, abi, query, eventObjectName, dataObjectName } = clients [network];
    const client = createSubscriptionObservable (
        wsurl, query, clients [network].variables                                               
    );
    client.subscribe ({
        next: (eventData) => {
            const { data } = eventData;
            let currentEvent = data [eventObjectName] [0];
            if (!currentEvent) return;
            let data_raw = currentEvent [dataObjectName];
            data_raw = typeof data_raw === 'string' ? JSON.parse (data_raw) [0] : data_raw;
            console.log (data_raw);
            const parsed = parseLogData (data_raw, abi);
            if (parsed) {
                cb (parsed);
            }
        },
        error: (error) => {
            console.log ('error', error);
        }
    })
    
    return client;
}

const testnetClient = createSubscriptionClient ('testnet', parsed => {
    console.log (parsed);
});

// const mainnetClient = createSubscriptionClient ('mainnet', parsed => {
//     console.log ('parsed');
// });