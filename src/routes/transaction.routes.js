import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createTransaction,
  listTransactions,
  deleteTransaction
} from "../controllers/transaction.controller.js";

const router = Router();

router.post("/create-transaction", authMiddleware, createTransaction);
router.get("/list-transaction", authMiddleware, listTransactions);
router.delete("/delete-transaction/:id", authMiddleware, deleteTransaction);

export default router;