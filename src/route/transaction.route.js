import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { addTransaction, getTransactions } from "../controller/transactionController.js";

const router = Router();

// Protecting all transaction routes
router.use(authMiddleware);

// adding an income or expense
router.post("/add", addTransaction);

// fetching the last 20 records
router.get("/history", getTransactions);

export default router;