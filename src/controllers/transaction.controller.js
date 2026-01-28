import Transaction from "../models/TransactionModel.js";

export const createTransaction = async (req, res) => {
  try {
    const { type, description, amount, date } = req.body;

    if (!type || !description || !amount) {
      return res.status(400).json({ message: "Dados incompletos" });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      type,
      description,
      amount,
      date
    });

    return res.status(201).json(transaction);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};

export const listTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.userId
    }).sort({ date: -1 });

    return res.json(transactions);
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};

export const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.userId
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transação não encontrada" });
    }

    return res.json({ message: "Transação removida" });
  } catch (err) {
    return res.status(500).json({ message: "Erro interno" });
  }
};
