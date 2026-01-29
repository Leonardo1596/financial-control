import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { importCSV } from "../controllers/import.controller.js";

const router = Router();

const upload = multer({
  dest: "uploads/"
});

router.post(
  "/import",
  authMiddleware,
  upload.single("file"),
  importCSV
);

export default router;
