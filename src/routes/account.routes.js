import { Router } from "express";
import { create, deleteAccount } from '../controllers/account.controller.js';
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();
router.post("/create-account", authMiddleware,create);
router.delete("/delete-account/:id", authMiddleware, deleteAccount);

export default router;