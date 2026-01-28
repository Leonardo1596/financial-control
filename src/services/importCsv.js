import fs from "fs";
import csv from "csv-parser";
import { Readable } from "stream";
import Transaction from "../models/TransactionModel.js";

function parseAmount(raw) {
  if (!raw) return null;

  let value = raw.toString().trim();

  if (value.includes(".") && value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }

  const n = Number(value);
  return isNaN(n) ? null : n;
}

function parseDate(str) {
  if (!str) return null;

  if (str.includes("/")) {
    const [d, m, y] = str.split("/");
    return new Date(`${y}-${m}-${d}`);
  }

  if (str.includes("-")) {
    const [d, m, y] = str.split("-");
    return new Date(`${y}-${m}-${d}`);
  }

  return null;
}

function normalizeCsv(path) {
  const content = fs.readFileSync(path, "utf8");

  // Mercado Pago: ignora bloco de resumo
  if (content.includes("RELEASE_DATE")) {
    const lines = content.split("\n");
    const startIndex = lines.findIndex(l =>
      l.startsWith("RELEASE_DATE")
    );

    if (startIndex !== -1) {
      return lines.slice(startIndex).join("\n");
    }
  }

  return content;
}

export const importCsv = (path, userId) => {
  return new Promise((resolve, reject) => {
    const transactions = [];

    const normalized = normalizeCsv(path);
    const separator = normalized.split("\n")[0].includes(";") ? ";" : ",";

    const readable = Readable.from(normalized);

    readable
      .pipe(csv({ separator }))
      .on("data", (row) => {
        // NUBANK
        if (row["Valor"] && row["Data"]) {
          const amount = parseAmount(row["Valor"]);
          const date = parseDate(row["Data"]);
          if (amount === null || !date) return;

          transactions.push({
            user: userId,
            description: row["Descrição"]?.trim(),
            amount: Math.abs(amount),
            type: amount < 0 ? "expense" : "income",
            date,
            externalId: row["Identificador"],
            source: "nubank",
          });
          return;
        }

        // MERCADO PAGO
        if (row["TRANSACTION_NET_AMOUNT"] && row["RELEASE_DATE"]) {
          const amount = parseAmount(row["TRANSACTION_NET_AMOUNT"]);
          const date = parseDate(row["RELEASE_DATE"]);
          if (amount === null || !date) return;

          transactions.push({
            user: userId,
            description: row["TRANSACTION_TYPE"]?.trim(),
            amount: Math.abs(amount),
            type: amount < 0 ? "expense" : "income",
            date,
            externalId: row["REFERENCE_ID"],
            source: "mercadopago",
          });
        }
      })
      .on("end", async () => {
        try {
          if (transactions.length > 0) {
            await Transaction.insertMany(transactions);
          }
          fs.unlinkSync(path);
          resolve(transactions.length);
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
};
