import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// Initialize Firebase Admin
let app: admin.app.App;

if (!admin.apps.length) {
  // Option 1: Load from a file path defined in .env
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    );
    if (fs.existsSync(serviceAccountPath)) {
      app = admin.initializeApp({
        credential: admin.credential.cert(require(serviceAccountPath)),
      });
    } else {
      console.warn(
        "Firebase Service Account file not found at path:",
        serviceAccountPath
      );
      app = admin.initializeApp(); // Fallback (might work if running in GCP)
    }
  }
  // Option 2: Load from a JSON string in .env
  else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  // Option 3: Default init (expects GOOGLE_APPLICATION_CREDENTIALS env var)
  else {
    app = admin.initializeApp();
  }
} else {
  app = admin.apps[0]!;
}

export const adminAuth = app.auth();
export const adminFirestore = app.firestore();
