import { Router } from "express";
import { create, deleteAccount, updateAccount, listAccounts } from '../controllers/account.controller.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();
router.post("/create-account", authMiddleware,create);
router.delete("/delete-account/:id", authMiddleware, deleteAccount);
router.put("/update-account/:id", authMiddleware, updateAccount);
router.get("/list-accounts", authMiddleware, listAccounts);

export default router;