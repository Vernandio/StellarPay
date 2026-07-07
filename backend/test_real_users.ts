import * as admin from 'firebase-admin';
import { Horizon, TransactionBuilder, Operation, Asset, BASE_FEE, Keypair } from '@stellar/stellar-sdk';

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const server = new Horizon.Server("https://horizon-testnet.stellar.org");

async function main() {
  const senderDoc = await db.collection('users').doc('b4toxtupXLYTD3et1mc0bGYCSof1').get(); 
  const receiverDoc = await db.collection('users').doc('MQ0K1phdj7PoRs49dRR7rovkZNF2').get(); 
  
  const senderData = senderDoc.data()!;
  const receiverData = receiverDoc.data()!;
  
  console.log("Sender PK:", senderData.stellarPublicKey);
  console.log("Receiver PK:", receiverData.stellarPublicKey);
  
  if (!senderData.stellarPrivateKey) {
    console.log("No private key for sender in Firestore backup!");
    return;
  }
  
  const senderKeypair = Keypair.fromSecret(senderData.stellarPrivateKey);
  
  try {
    const account = await server.loadAccount(senderKeypair.publicKey());
    
    console.log("Sending 20 XLM...");
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: "Test SDF Network ; September 2015",
    })
      .addOperation(
        Operation.payment({
          destination: receiverData.stellarPublicKey,
          asset: Asset.native(),
          amount: "20",
        })
      )
      .setTimeout(30)
      .build();

    tx.sign(senderKeypair);
    
    try {
      const result = await server.submitTransaction(tx);
      console.log("Success:", result.hash);
    } catch (err: any) {
      console.error("Error submitting tx:", JSON.stringify(err.response?.data || {}));
    }
  } catch (err: any) {
    console.error("Error loading account:", err.message);
  }
}
main().catch(console.error);
