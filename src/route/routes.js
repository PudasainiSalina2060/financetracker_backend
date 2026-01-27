import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { registerController, loginController, refreshController, logoutController,profileController,updateProfileController, forgotPassword,resetPassword} from "../controller/userController.js";
import googleAuthRoutes from "./googleAuth.route.js";
import accountRoutes from "./account.route.js";

const router = Router();

// Auth routes

// router.get("/",(req,res)=>{
//     return res.json("Smartbudget");
// });

//making registered api
router.post("/register", registerController);

router.post("/login", loginController);

//refresh token api
router.post("/refreshtoken", refreshController);

// router.get("/test", authMiddleware, (req, res) => {
//   res.json({
//     message: "Protected route accessed",
//     user: req.user
//   });
// });

router.post("/logout", logoutController);

// Profile routes (protected)

/*
Protected Routes
These routes require the user to be authenticated the authMiddleware verifies the access token sent in the 
Authorization header (Bearer <token>) and attaches the  decoded user info to req.user. 
It allows controllers like profileController and updateProfileController to safely access the logged in user's data.
Without this middleware, req.user would be undefined and  the controllers would not know which user is making the request.
 */
router.get("/profile", authMiddleware,profileController);
router.put("/updateprofile", authMiddleware, updateProfileController);

router.post("/forgotpassword", forgotPassword);
router.post("/resetpassword", resetPassword);

//Modular Routes
router.use("/auth", googleAuthRoutes);
router.use("/accounts", accountRoutes); // mounts all account routes at /api/accounts


export default router;