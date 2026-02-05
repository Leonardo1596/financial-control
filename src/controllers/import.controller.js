import fs from "fs";
import csv from "csv-parser";
import Transaction from "../models/TransactionModel.js";

// Parse Brazilian date with optional time
function parseBrazilianDate(value) {
  if (!value || typeof value !== "string") return null;

  // Remove time if exists
  const datePart = value.split(" ")[0];

  const sep = datePart.includes("/") ? "/" : "-";
  const parts = datePart.split(sep);

  if (parts.length !== 3) return null;

  const [day, month, year] = parts;

  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  return isNaN(date.getTime()) ? null : date;
}

// Parse monetary values like 8.962,00
function parseAmount(value) {
  if (value === undefined || value === null) return null;

  const normalized = value
    .toString()
    .trim()
    .replace("R$", "")
    .replace(/\./g, "") // remove thousand separator
    .replace(",", "."); // decimal separator

  const amount = Number(normalized);
  return Number.isNaN(amount) ? null : amount;
}

export async function importCSV(req, res) {
  try {
    const userId = req.userId;
    const file = req.file;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!file) {
      return res.status(400).json({ message: "Arquivo não enviado" });
    }

    const transactionsToInsert = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(
          csv({
            separator: file.originalname.includes(";") ? ";" : ",",
          })
        )
        .on("data", (row) => {
          const rawDate =
            row.Data || row.RELEASE_DATE || row.date || row.data;

          const rawAmount =
            row.Valor || row.TRANSACTION_NET_AMOUNT || row.valor;

          const rawDesc =
            row.Descrição ||
            row.TRANSACTION_TYPE ||
            row.descricao ||
            row.description;

          const date = parseBrazilianDate(rawDate);
          const amount = parseAmount(rawAmount) / 100;

          if (!date || amount === null || !rawDesc) return;

          transactionsToInsert.push({
            user: userId,
            description: rawDesc.trim(),
            amount: Math.abs(amount),
            type: amount >= 0 ? "income" : "expense",
            date,
          });
        })
        .on("end", resolve)
        .on("error", reject);
    });

    fs.unlinkSync(file.path);

    if (transactionsToInsert.length === 0) {
      return res.json({
        message: "Nenhuma transação válida encontrada",
        total: 0,
      });
    }

    // Deduplication
    const existing = await Transaction.find({
      user: userId,
      date: { $in: transactionsToInsert.map((t) => t.date) },
      amount: { $in: transactionsToInsert.map((t) => t.amount) },
    }).select("date amount description");

    const existingSet = new Set(
      existing.map(
        (t) =>
          `${t.date.toISOString()}-${t.amount}-${t.description}`
      )
    );

    const uniqueTransactions = transactionsToInsert.filter((t) => {
      const key = `${t.date.toISOString()}-${t.amount}-${t.description}`;
      return !existingSet.has(key);
    });

    if (uniqueTransactions.length > 0) {
      await Transaction.insertMany(uniqueTransactions);
    }

    return res.json({
      message: "Importação concluída",
      total: uniqueTransactions.length,
    });
  } catch (err) {
    console.error("Error importing CSV:", err);
    return res.status(500).json({
      message: "Erro ao importar arquivo",
    });
  }
}
