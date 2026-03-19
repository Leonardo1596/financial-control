import fs from "fs";
import csv from "csv-parser";
import Transaction from "../models/TransactionModel.js";

/**
 * Normaliza keys do CSV
 */
function normalizeKey(key) {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uFEFF/g, "")
    .trim();
}

/**
 * Parse de data BR (DD/MM/YYYY ou DD/MM/YY)
 */
function parseBrazilianDate(value) {
  if (!value || typeof value !== "string") return null;

  const datePart = value.split(" ")[0];
  const parts = datePart.split(/[\/-]/);

  if (parts.length !== 3) return null;

  let [day, month, year] = parts;

  if (year.length === 2) {
    year = `20${year}`;
  }

  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parse de valor monetário (R$, vírgula, etc)
 */
function parseAmount(value) {
  if (value === undefined || value === null) return null;

  let normalized = value.toString().trim();

  normalized = normalized
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

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

    // 🔥 Detecta separador pelo conteúdo (não pelo nome 🤡)
    const fileContent = fs.readFileSync(file.path, "utf8");
    const separator = fileContent.includes(";") ? ";" : ",";

    await new Promise((resolve, reject) => {
      fs.createReadStream(file.path)
        .pipe(csv({ separator }))
        .on("data", (row) => {
          // 🔥 normaliza keys
          const normalizedRow = {};
          for (const key in row) {
            normalizedRow[normalizeKey(key)] = row[key];
          }

          const rawDate =
            normalizedRow["data"] ||
            normalizedRow["release_date"];

          const rawAmount =
            normalizedRow["valor"] ||
            normalizedRow["transaction_net_amount"];

          const rawDesc =
            normalizedRow["descricao"] ||
            normalizedRow["transaction_type"];

          const date = parseBrazilianDate(rawDate);
          const amount = parseAmount(rawAmount);

          if (!date || amount === null || !rawDesc) return;

          transactionsToInsert.push({
            user: userId,
            description: rawDesc.trim(),
            amount: Math.abs(amount), // 🔥 SEM dividir por 100
            type: amount < 0 ? "expense" : "income",
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

    // 🔥 Deduplicação
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