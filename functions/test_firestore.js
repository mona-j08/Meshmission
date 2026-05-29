const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

async function checkDonations() {
  try {
    const db = admin.firestore();
    const donationsSnap = await db.collection('donations').get();
    
    console.log(`Total donations: ${donationsSnap.size}`);
    donationsSnap.forEach(doc => {
      console.log(`Donation: ${doc.id}`, doc.data());
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
  }
}

checkDonations();
