import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import {
  createGroup,
  getGroups,
  addMemberToGroup,
  addGroupExpense,
  getGroupExpenses,
  settleShare,
  deleteGroupExpense,
   getGroupMembers
} from "../controller/splitController.js";

const router = Router();

// Group routes
router.post("/groups/create", authMiddleware, createGroup);
router.get("/groups", authMiddleware, getGroups);
router.post("/groups/:groupId/members", authMiddleware, addMemberToGroup);

// Expense routes
router.post("/groups/:groupId/expenses", authMiddleware, addGroupExpense);
router.get("/groups/:groupId/expenses", authMiddleware, getGroupExpenses);

// Settlement
router.put("/shares/:shareId/settle", authMiddleware, settleShare);

// Delete expense
router.delete("/expenses/:expenseId", authMiddleware, deleteGroupExpense);

// Fetch members of a group
router.get("/groups/:groupId/members", authMiddleware, getGroupMembers);

export default router;