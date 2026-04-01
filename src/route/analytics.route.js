import express from "express";
import authenticate from "../middleware/authenticate.js";

import {
  getSummary,
  getCategoryBreakdown,
  getIncomeVsExpense,
  getSpendingTrend,
  getBudgetUtilization,
} from "../controller/analyticsController.js";

const router = express.Router();

//allroutes need login (JWT token required)

//get overall summary (income, expense, balance and count)
router.get("/summary", authenticate, getSummary);

//get category-wise spending (for chart)
router.get("/categories", authenticate, getCategoryBreakdown);

//get income vs expense (last 6 months)
router.get("/income-vs-expense", authenticate, getIncomeVsExpense);

//get spending trend (daily this month)
router.get("/trend", authenticate, getSpendingTrend);

//get budget usage (spent and percentage)
router.get("/budget-utilization", authenticate, getBudgetUtilization);

export default router;