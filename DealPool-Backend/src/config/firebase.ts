// Firebase Admin SDK configuration.
// Loads .env.test when NODE_ENV=test for test isolation.
import dotenv from "dotenv";
import {
    cert,
    getApps,
    initializeApp,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const envFile = process.env.NODE_ENV === "test" ? ".env.test" : ".env";
dotenv.config({ path: envFile });

const app =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp({
              credential: cert({
                  projectId:
                      process.env.FIREBASE_PROJECT_ID,
                  clientEmail:
                      process.env.FIREBASE_CLIENT_EMAIL,
                  privateKey:
                      process.env.FIREBASE_PRIVATE_KEY?.replace(
                          /\\n/g,
                          "\n"
                      ),
              }),
          });

export const firebaseAuth = getAuth(app);