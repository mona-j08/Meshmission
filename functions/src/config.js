const admin = require('firebase-admin');
const functions = require('firebase-functions');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();

// Firestore helper shortcuts
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

module.exports = {
  admin,
  db,
  auth,
  messaging,
  FieldValue,
  Timestamp,
  functions,
};
