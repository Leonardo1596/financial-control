import express from "express";
import dotenv from "dotenv";
import { connectDatabase } from "./config/database.js";

dotenv.config();

const app = express();

app.use(express.json());

// conecta no banco
connectDatabase();

app.get("/", (req, res) => {
  res.send("Finance Control API rodando com MongoDB 😎");
});

app.listen(process.env.PORT, () => {
  console.log(`Server rodando na porta ${process.env.PORT}`);
});
