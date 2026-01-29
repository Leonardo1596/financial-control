import fs from "fs";
import csv from "csv-parser";
import Transaction from "../models/TransactionModel.js";

// Convert date strings (DD/MM/YYYY or DD-MM-YYYY) to Date
function parseBrazilianDate(value) {
  if (!value || typeof value !== "string") return null;

  const sep = value.includes("/") ? "/" : "-";
  const parts = value.split(sep);

  if (parts.length !== 3) return null;

  const [day, month, year] = parts;

  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  return isNaN(date.getTime()) ? null : date;
}

// Convert monetary values safely
function parseAmount(value) {
  if (value === undefined || value === null) return null;

  const normalized = value
    .toString()
    .trim()
    .replace("R$", "")
    .replace(",", "."); // only comma -> dot

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

    const { startDate, endDate } = req.body;

    let start = null;
    let end = null;

    if (startDate) {
      const d = new Date(`${startDate}T00:00:00Z`);
      if (!isNaN(d.getTime())) start = d;
    }

    if (endDate) {
      const d = new Date(`${endDate}T23:59:59Z`);
      if (!isNaN(d.getTime())) end = d;
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
            row.Descrição || row.TRANSACTION_TYPE || row.descricao;

          const date = parseBrazilianDate(rawDate);
          const amount = parseAmount(rawAmount);

          if (!date || amount === null || !rawDesc) return;

          if (start && date < start) return;
          if (end && date > end) return;

          transactionsToInsert.push({
            user: userId,
            description: rawDesc,
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
      date: {
        $in: transactionsToInsert.map((t) => t.date),
      },
      amount: {
        $in: transactionsToInsert.map((t) => t.amount),
      },
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
