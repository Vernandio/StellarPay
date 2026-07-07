import * as admin from 'firebase-admin';
import { Horizon } from '@stellar/stellar-sdk';

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const server = new Horizon.Server("https://horizon-testnet.stellar.org");

async function main() {
  const snapshot = await db.collection('users').get();
  console.log(`Found ${snapshot.size} users.`);
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const pk = data.stellarPublicKey;
    console.log(`\nUser: ${data.displayName || data.username} (${doc.id})`);
    console.log(`PublicKey: ${pk || 'NONE'}`);
    
    if (pk) {
      try {
        const account = await server.loadAccount(pk);
        console.log(`Balances:`, account.balances.map(b => `${b.balance} ${b.asset_type}`));
      } catch (e: any) {
        console.log(`Error loading account: ${e.response?.status || e.message}`);
      }
    }
  }
}
main().catch(console.error);
