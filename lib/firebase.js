// import admin from 'firebase-admin';
require ('dotenv').config ();
const admin = require ('firebase-admin');
let testnet;
let mainnet;
try {
  admin.initializeApp({
    credential: admin.credential.cert ({
      project_id: process.env.FIREBASE_MAIN_PROJECT_ID,
      private_key: process.env.FIREBASE_MAIN_PRIVATE_KEY.replace (/\\n/g, '\n'),
      client_email: process.env.FIREBASE_MAIN_CLIENT_EMAIL
    })
  });
  testnet = admin.initializeApp({
    credential: admin.credential.cert ({
      project_id: process.env.FIREBASE_TEST_PROJECT_ID,
      private_key: process.env.FIREBASE_TEST_PRIVATE_KEY.replace (/\\n/g, '\n'),
      client_email: process.env.FIREBASE_TEST_CLIENT_EMAIL
    }),
  }, 'testnet');
} catch (error) {
  /*
   * We skip the "already exists" message which is
   * not an actual error when we're hot-reloading.
   */
  if (!/already exists/u.test (error.message)) {
    // eslint-disable-next-line no-console
    console.error ('Firebase admin initialization error', error.stack);
  }
}

module.exports = { 
  mainnet: admin.firestore (),
  testnet: testnet.firestore ()
}