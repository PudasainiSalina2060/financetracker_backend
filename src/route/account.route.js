import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { 
    addAccount, 
    getAccounts, 
    updateAccount, 
    deleteAccount 
} from "../controller/accountController.js";

const router = Router();

// Applying middleware to all routes in this file - Protected routes
router.use(authMiddleware);

router.post("/add", addAccount);
router.get("/all", getAccounts);
router.put("/update/:accountId", updateAccount);
router.delete("/delete/:accountId", deleteAccount);

export default router;