import { Router } from "express";
import { createCategory, getCategories, getCategoryById } from "../controllers/category.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();
router.post("/create-category", authMiddleware, createCategory);
router.get("/categories", authMiddleware, getCategories);
router.get("/category/:id", authMiddleware, getCategoryById);

export default router;
