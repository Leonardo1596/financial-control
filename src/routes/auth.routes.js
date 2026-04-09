import { Router } from "express";
import { register, login, changePassword } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post('/login', login);
router.put("/change-password", authMiddleware, changePassword);

export default router;
