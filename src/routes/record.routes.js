import { Router } from "express";
import { closeMonth } from "../controllers/monthlyRecord.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post(
  "/records/close-month",
  authMiddleware,
  closeMonth
);

export default router;
