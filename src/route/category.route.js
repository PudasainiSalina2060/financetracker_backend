import { Router } from "express";
import authMiddleware from "../middleware/authenticate.js";
import { getCategories, createCategory } from "../controller/categoryController.js";

const router = Router();

// Protecting all category routes
router.use(authMiddleware);

// get all (defaults category and  category created by user)
router.get("/all", getCategories);

// add a new custom category
router.post("/add", createCategory);

export default router;