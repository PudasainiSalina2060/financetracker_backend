import express from "express";
import { firebaseAuthenticate } from "../middleware/firebaseAuthenticate.js";
import { googleLogin } from "../controller/authController.js";

const router = express.Router();

router.post("/google-login", firebaseAuthenticate, googleLogin);

export default router;
