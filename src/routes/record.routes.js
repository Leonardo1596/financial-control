import { Router } from "express";
import { closeMonth, getMonthlySummary } from "../controllers/monthlyRecord.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post(
  "/records/close-month",
  authMiddleware,
  closeMonth
);
router.get(
  "/records/monthly-summary",
  authMiddleware,
  getMonthlySummary
);


export default router;
