import fs from "fs";
import csv from "csv-parser";
import { Readable } from "stream";
import Transaction from "../models/TransactionModel.js";

/**
 * Parse seguro de valores monetários
 */
function parseAmount(raw) {
  if (!raw) return null;

  let value = raw.toString().trim();

  // remove espaços e símbolos
  value = value.replace(/\s/g, "");

  // ponto + vírgula
  if (value.includes(".") && value.includes(",")) {
    // BR 1.234,56
    if (value.lastIndexOf(",") > value.lastIndexOf(".")) {
      value = value.replace(/\./g, "").replace(",", ".");
    } 
    // US 1,234.56
    else {
      value = value.replace(/,/g, "");
    }
  }
  // só vírgula
  else if (value.includes(",")) {
    value = value.replace(",", ".");
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse de datas DD/MM/YYYY
 */
function parseDate(str) {
  if (!str) return null;

  const value = str.trim();
  let d, m, y;

  if (value.includes("/")) {
    [d, m, y] = value.split("/");
  } else if (value.includes("-")) {
    [d, m, y] = value.split("-");
  } else {
    return null;
  }

  // força data sem timezone bugado
  return new Date(Number(y), Number(m) - 1, Number(d));
}

/**
 * Remove lixo do Mercado Pago
 */
function normalizeCsv(path) {
  const content = fs.readFileSync(path, "utf8");

  if (content.includes("RELEASE_DATE")) {
    const lines = content.split("\n");
    const startIndex = lines.findIndex(line =>
      line.startsWith("RELEASE_DATE")
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

    Readable.from(normalized)
      .pipe(csv({ separator }))
      .on("data", (row) => {

        /**
         * =========
         * NUBANK
         * =========
         */
        if (row["Valor"] && row["Data"]) {
          const amount = parseAmount(row["Valor"]);
          const date = parseDate(row["Data"]);

          if (amount === null || !date) return;

          transactions.push({
            user: userId,
            description: row["Descrição"]?.trim(),
            amount: Math.abs(amount) * 100, // EM REAIS
            type: amount < 0 ? "expense" : "income",
            date,
            externalId: row["Identificador"],
            source: "nubank",
          });

          return;
        }

        /**
         * =========
         * MERCADO PAGO
         * =========
         */
        if (row["TRANSACTION_NET_AMOUNT"] && row["RELEASE_DATE"]) {
          const amount = parseAmount(row["TRANSACTION_NET_AMOUNT"]);
          const date = parseDate(row["RELEASE_DATE"]);

          if (amount === null || !date) return;

          transactions.push({
            user: userId,
            description: row["TRANSACTION_TYPE"]?.trim(),
            amount: Math.abs(amount), // EM REAIS
            type: amount < 0 ? "expense" : "income",
            date,
            externalId: row["REFERENCE_ID"],
            source: "mercadopago",
          });
        }
      })
      .on("end", async () => {
        try {
          if (transactions.length) {
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