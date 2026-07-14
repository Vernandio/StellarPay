const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const serviceAccountPath = path.resolve(__dirname, "./serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

const db = admin.firestore();

async function run() {
  const snapshot = await db.collection("requests").orderBy("createdAt", "desc").limit(5).get();
  console.log("=== LATEST 5 REQUESTS ===");
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log({
      id: data.id,
      senderUsername: data.senderUsername,
      receiverUsername: data.receiverUsername,
      amountUSD: data.amountUSD,
      status: data.status,
      onChainBillId: data.onChainBillId,
      createdAt: data.createdAt ? data.createdAt.toDate().toLocaleString() : null,
      message: data.message,
    });
  });
  process.exit(0);
}

run().catch(console.error);
