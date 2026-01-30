import { Router } from "express";
import {
  create,
  list,
  getById,
  update,
  pay,
  remove
} from "../controllers/accountPayable.controller.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/create", authMiddleware, create);
router.get("/list", authMiddleware, list);
router.get("/get-by-id/:id", authMiddleware, getById);
router.put("/update/:id", authMiddleware, update);
router.patch("/pay/:id", authMiddleware, pay);
router.delete("/delete/:id", authMiddleware, remove);

export default router;
