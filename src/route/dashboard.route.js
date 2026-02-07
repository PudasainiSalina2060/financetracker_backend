import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { getBalanceSummary, getCategorySpending } from "../controller/dashboardController.js";

const router = Router();

//Protecting all dashboard routes so only logged in users see their data
router.use(authMiddleware);

//get total balance, monthly income and monthly expenses
router.get("/summary", getBalanceSummary);

router.get("/spending-chart", getCategorySpending);
export default router;