const { createClient } = require ('graphql-ws');
const ws = require ('ws');
const client = createClient({
  url: 'wss://reefscan.com/api/v3',
  webSocketImpl: ws,
});


client.subscribe (
  {
    query: `
    subscription Subscription_root($where: event_bool_exp) {
        event(where: $where) {
          data
        }
      }`
  }, {
    next: (data) => { console.log (data); },
    error: (error) => { console.log (error); },
    complete: () => { console.log ('complete'); }
  }
);
