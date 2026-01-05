import admin from "firebase-admin";
import serviceAccount from "./secrets/firebase-service-account.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
