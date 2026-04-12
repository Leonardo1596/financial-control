import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  createTransaction,
  listTransactions,
  deleteTransaction,
  deleteAllTransactions,
  getSummary,
  filterTransactionsByName
} from "../controllers/transaction.controller.js";

const router = Router();

router.post("/create-transaction", authMiddleware, createTransaction);
router.get("/list-transaction", authMiddleware, listTransactions);
router.delete("/delete-transaction/:id", authMiddleware, deleteTransaction);
router.delete("/delete-all-transactions", authMiddleware, deleteAllTransactions);
router.get("/summary", authMiddleware, getSummary);
router.get("/filter-transactions-by-name", authMiddleware, filterTransactionsByName);


export default router;