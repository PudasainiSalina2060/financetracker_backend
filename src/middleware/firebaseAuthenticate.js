//verifies firebase token(Google login)
import admin from "../config/firebase.js";

export const firebaseAuthenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No Firebase token" });
    }

    const idToken = authHeader.split(" ")[1];

    const decodedToken = await admin.auth().verifyIdToken(idToken);

    req.firebaseUser = decodedToken; // uid, email, name, phone
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid Firebase token" });
  }
};

