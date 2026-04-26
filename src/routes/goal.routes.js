import { Router } from "express";
import { createGoal, listGoals, updateGoal, addValueToGoal, getGoalById, deleteGoal } from "../controllers/goals.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();
router.post("/create-goal", authMiddleware, createGoal);
router.get("/goals", authMiddleware, listGoals);
router.put("/goal/:id", authMiddleware, updateGoal);
router.patch("/goal/:id/add-value", authMiddleware, addValueToGoal);
router.get("/goal/:id", authMiddleware, getGoalById);
router.delete("/goal/:id", authMiddleware, deleteGoal);


export default router;