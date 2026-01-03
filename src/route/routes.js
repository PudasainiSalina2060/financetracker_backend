import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { registerController, loginController, refreshController } from "../controller/userController.js";


const router = Router();

// router.get("/",(req,res)=>{
//     return res.json("Smartbudget");
// });

//making registered api
router.post("/register", registerController);

router.post("/login", loginController);

//refresh token api
router.post("/refreshtoken", refreshController);

router.get("/test", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: req.user
  });
});


export default router;