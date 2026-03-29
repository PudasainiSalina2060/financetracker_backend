import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { setBudget, getBudgets, updateBudget, deleteBudget  } from "../controller/budgetController.js";

const router = Router();

// Protecting all budget routes so only logged in users see their data
router.use(authMiddleware);

//setting or updating a monthly budget for a category
router.post("/set", setBudget);

//fetching all budgets with spending progress
router.get("/progress", getBudgets);

//updating existing budget
router.put("/:id", updateBudget); 

//deleting the budget
router.delete("/:id", deleteBudget);

export default router;