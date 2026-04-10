import AccountModel from '../models/AccountModel.js';
import { calculateSummary } from "../utils/calculateSummary.js";

// 🔥 CREATE ACCOUNT
export async function create(req, res) {
  try {
    const { name, balance } = req.body;

    if (!name || balance === undefined) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const account = await AccountModel.create({
      userId: req.userId,
      name,
      balance
    });

    return res.status(201).json(account);
  } catch (error) {
    console.error("Erro ao criar conta:", error);
    return res.status(500).json({ error: "Erro ao criar conta" });
  }
}

// 🔥 DELETE ACCOUNT
export const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await AccountModel.findOneAndDelete({
      _id: id,
      userId: req.userId
    });

    if (!account) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    return res.json({ message: "Conta removida" });
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};

export const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const account = await AccountModel.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { name },
      { new: true }
    );

    if (!account) {
      return res.status(404).json({ message: "Conta não encontrada" });
    }

    return res.json(account);
  } catch (err) {
    console.error("Erro no updateAccount:", err);
    return res.status(500).json({ message: "Erro interno" });
  }
}

export const listAccounts = async (req, res) => {
  try {
    const userId = req.userId;
    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        message: "Mês e ano são obrigatórios",
      });
    }

    const m = Number(month);
    const y = Number(year);

    if (isNaN(m) || isNaN(y) || m < 1 || m > 12 || y < 2000) {
      return res.status(400).json({
        message: "Período inválido",
      });
    }

    const accounts = await AccountModel.find({ userId }).sort({ name: 1 });

    // 🧠 agora usa calculateSummary pra cada conta
    const accountsWithBalance = await Promise.all(
      accounts.map(async (acc) => {
        const summary = await calculateSummary({
          userId,
          month,
          year,
          accountId: acc._id.toString(),
        });

        return {
          ...acc.toObject(),
          balance: Number(summary.balance.toFixed(2)),
        };
      })
    );

    return res.json(accountsWithBalance);

  } catch (err) {
    console.error("Erro no listAccounts:", err);
    return res.status(500).json({ message: "Erro interno" });
  }
};