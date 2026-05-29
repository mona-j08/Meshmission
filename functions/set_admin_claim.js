const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const email = 'kamachisundar073@gmail.com';

async function setAdminClaim() {
  try {
    const user = await admin.auth().getUserByEmail(email);
    console.log(`Found user: ${user.email} with UID: ${user.uid}`);
    
    // Set custom claims
    await admin.auth().setCustomUserClaims(user.uid, { role: 'admin' });
    console.log(`Successfully set 'admin' custom claim for ${email}.`);
    
    // Also write it to Firestore users collection to ensure consistency
    const db = admin.firestore();
    await db.collection('users').doc(user.uid).set({
      userId: user.uid,
      role: 'admin',
      name: 'System Admin',
      email: email,
      isActive: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log(`Successfully updated Firestore user document for ${email}.`);
    
  } catch (error) {
    console.error('Error setting admin claim:', error.message);
  }
}

setAdminClaim();
