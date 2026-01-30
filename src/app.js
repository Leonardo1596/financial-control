import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectDatabase } from "./config/database.js";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Import routes
import authRoutes from "./routes/auth.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import recordRoutes from "./routes/record.routes.js";
import accountPayableRoutes from "./routes/accountPayable.routes.js";

// Use routes
app.use(authRoutes);
app.use(transactionRoutes);
app.use(uploadRoutes);
app.use(recordRoutes);
app.use(accountPayableRoutes);

// conecta no banco
connectDatabase();

app.get("/", (req, res) => {
  res.send("Finance Control API rodando com MongoDB 😎");
});

app.listen(process.env.PORT, () => {
  console.log(`Server rodando na porta ${process.env.PORT}`);
});
