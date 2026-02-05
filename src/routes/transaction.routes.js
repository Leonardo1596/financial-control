import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createTransaction,
  listTransactions,
  deleteTransaction,
  deleteAllTransactions,
  getSummary
} from "../controllers/transaction.controller.js";

const router = Router();

router.post("/create-transaction", authMiddleware, createTransaction);
router.get("/list-transaction", authMiddleware, listTransactions);
router.delete("/delete-transaction/:id", authMiddleware, deleteTransaction);
router.delete("/delete-all-transactions", authMiddleware, deleteAllTransactions);
router.get("/summary", authMiddleware, getSummary);


export default router;