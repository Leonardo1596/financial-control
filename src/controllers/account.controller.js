import AccountModel from '../models/AccountModel.js';
import Transaction from '../models/TransactionModel.js';
import mongoose from 'mongoose';

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

// 🔥 LIST ACCOUNTS COM SALDO REAL
export const listAccounts = async (req, res) => {
  try {
    const userId = req.userId;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const accounts = await AccountModel.find({ userId }).sort({ name: 1 });

    const balances = await Transaction.aggregate([
      {
        $match: { user: userObjectId }
      },
      {
        $group: {
          _id: "$accountId",
          balance: {
            $sum: {
              $cond: [
                { $eq: ["$type", "expense"] },
                { $multiply: ["$amount", -1] },
                "$amount"
              ]
            }
          }
        }
      }
    ]);

    const balanceMap = {};
    balances.forEach(b => {
      balanceMap[b._id.toString()] = b.balance;
    });

    const accountsWithBalance = accounts.map(acc => {
      const calculatedBalance = balanceMap[acc._id.toString()] || 0;

      return {
        ...acc.toObject(),
        balance: acc.balance + calculatedBalance
      };
    });

    return res.json(accountsWithBalance);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erro interno" });
  }
};