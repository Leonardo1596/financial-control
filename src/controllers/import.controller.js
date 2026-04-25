import fs from "fs";
import csv from "csv-parser";
import { Readable } from "stream";
import Transaction from "../models/TransactionModel.js";
import Category from "../models/CategoryModel.js"; // 🔥 ADICIONADO

function normalizeKey(key) {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\uFEFF/g, "")
    .trim();
}

function normalizeCsvContent(content) {
  const lines = content.split("\n");

  const startIndex = lines.findIndex(line =>
    line.includes("RELEASE_DATE")
  );

  if (startIndex !== -1) {
    return lines.slice(startIndex).join("\n");
  }

  return content;
}

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

function parseAmount(value) {
  if (value === undefined || value === null) return null;

  let normalized = value.toString().trim();

  normalized = normalized.replace("R$", "").replace(/\s/g, "");

  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");

  if (hasComma) {
    normalized = normalized
      .replace(/\./g, "")
      .replace(",", ".");
  }

  let amount = Number(normalized);

  if (Number.isNaN(amount)) return null;

  if (!hasComma && !hasDot) {
    amount = amount / 100;
  }

  return amount;
}

export async function importCSV(req, res) {
  try {
    const userId = req.userId;
    const file = req.file;
    const { accountId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!file) {
      return res.status(400).json({ message: "Arquivo não enviado" });
    }

    if (!accountId) {
      return res.status(400).json({ message: "Conta não informada" });
    }

    const transactionsToInsert = [];

    let fileContent = fs.readFileSync(file.path, "utf8");
    fileContent = normalizeCsvContent(fileContent);

    const separator = fileContent.includes(";") ? ";" : ",";

    await new Promise((resolve, reject) => {
      Readable.from(fileContent)
        .pipe(csv({ separator }))
        .on("data", (row) => {
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
            accountId,
            description: rawDesc.trim(),
            amount: Math.abs(amount),
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

    // 🔥 Deduplicação COM accountId
    const existing = await Transaction.find({
      user: userId,
      accountId,
      date: { $in: transactionsToInsert.map((t) => t.date) },
      amount: { $in: transactionsToInsert.map((t) => t.amount) },
    }).select("date amount description accountId");

    const existingSet = new Set(
      existing.map(
        (t) =>
          `${t.date.toISOString()}-${t.amount}-${t.description}-${t.accountId}`
      )
    );

    const uniqueTransactions = transactionsToInsert.filter((t) => {
      const key = `${t.date.toISOString()}-${t.amount}-${t.description}-${t.accountId}`;
      return !existingSet.has(key);
    });

    // 🔥 ADICIONADO: buscar categorias padrão
    const defaultCategories = await Category.find({ isDefault: true });

    const categoryMap = {
      expense: defaultCategories.find(
        (c) => c.name.toLowerCase() === "outros" && c.type === "expense"
      ),
      income: defaultCategories.find(
        (c) => c.name.toLowerCase() === "outros" && c.type === "income"
      ),
    };

    if (!categoryMap.expense || !categoryMap.income) {
      console.error(categoryMap);
      return res.status(500).json({
        message: "Categorias padrão não encontradas",
      });
    }

    // 🔥 ADICIONADO: inserir categoryId
    const uniqueTransactionsWithCategory = uniqueTransactions.map((t) => ({
      ...t,
      categoryId: categoryMap[t.type]._id,
    }));

    if (uniqueTransactionsWithCategory.length > 0) {
      await Transaction.insertMany(uniqueTransactionsWithCategory);
    }

    return res.json({
      message: "Importação concluída",
      total: uniqueTransactionsWithCategory.length,
    });
  } catch (err) {
    console.error("Error importing CSV:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
}