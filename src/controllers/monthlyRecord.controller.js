import MonthlySummary from "../models/MonthlySummaryModel.js";
import Transaction from "../models/TransactionModel.js";
import Account from "../models/AccountModel.js";
import mongoose from "mongoose";

export async function closeMonth(req, res) {
  try {
    const userId = req.userId;
    const { month, year } = req.body;

    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado",
      });
    }

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

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 🔥 busca TODAS as contas do usuário
    const accounts = await Account.find({ userId: userObjectId });

    if (!accounts.length) {
      return res.status(400).json({
        message: "Nenhuma conta encontrada",
      });
    }

    const results = [];

    for (const account of accounts) {
      const accountObjectId = account._id;

      // 📅 intervalo
      const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

      // 🚫 evita duplicado
      const alreadyClosed = await MonthlySummary.findOne({
        user: userObjectId,
        month: m,
        year: y,
        account: accountObjectId,
      });

      if (alreadyClosed) {
        results.push({
          account: account.name,
          status: "already_closed",
          summary: alreadyClosed,
        });
        continue;
      }

      // 🔥 garante ordem
      if (m !== 1) {
        const prevMonth = m === 1 ? 12 : m - 1;
        const prevYear = m === 1 ? y - 1 : y;

        const previousSummary = await MonthlySummary.findOne({
          user: userObjectId,
          month: prevMonth,
          year: prevYear,
          account: accountObjectId,
        });

        if (!previousSummary) {
          results.push({
            account: account.name,
            status: "error",
            message: "Mês anterior não fechado",
          });
          continue;
        }
      }

      // 🔍 transações da conta
      const match = {
        user: userObjectId,
        accountId: accountObjectId,
        date: { $gte: start, $lte: end },
      };

      const agg = await Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$type",
            total: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "expense"] },
                  { $multiply: ["$amount", -1] },
                  "$amount",
                ],
              },
            },
          },
        },
      ]);

      let income = 0;
      let expense = 0;

      agg.forEach((item) => {
        if (item._id === "income") income = item.total;
        if (item._id === "expense") expense = Math.abs(item.total);
      });

      // 🔥 saldo anterior
      const prevMonth = m === 1 ? 12 : m - 1;
      const prevYear = m === 1 ? y - 1 : y;

      const previousSummary = await MonthlySummary.findOne({
        user: userObjectId,
        month: prevMonth,
        year: prevYear,
        account: accountObjectId,
      });

      const previousBalance = previousSummary?.balance || 0;

      const rawBalance = previousBalance + income - expense;

      const balance = Number(rawBalance.toFixed(2));
      income = Number(income.toFixed(2));
      expense = Number(expense.toFixed(2));

      console.log({
        account: account.name,
        accountId: accountObjectId
      });

      const summary = await MonthlySummary.create({
        user: userObjectId,
        month: m,
        year: y,
        income,
        expense,
        balance,
        account: accountObjectId,
        closedAt: new Date(),
      });

      results.push({
        account: account.name,
        status: "closed",
        summary,
      });
    }

    return res.json({
      message: "Fechamento concluído",
      results,
    });

  } catch (err) {
    console.error("Error closing month:", err);

    return res.status(500).json({
      message: "Erro ao fechar o mês",
    });
  }
}

export async function getMonthlySummary(req, res) {
  try {
    const userId = req.userId;
    const { month, year, accountId } = req.query;

    if (!userId) {
      return res.status(401).json({
        message: "Usuário não autenticado",
      });
    }

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

    const userObjectId = new mongoose.Types.ObjectId(userId);

    // 🔥 CASO 1: conta específica
    if (accountId) {
      const accountObjectId = new mongoose.Types.ObjectId(accountId);

      const summary = await MonthlySummary.findOne({
        user: userObjectId,
        month: m,
        year: y,
        account: accountObjectId,
      });

      if (!summary) {
        return res.status(404).json({
          message: "Resumo não encontrado para esta conta",
        });
      }

      return res.json({ summary });
    }

    // 🔥 CASO 2: TODAS AS CONTAS
    const summaries = await MonthlySummary.find({
      user: userObjectId,
      month: m,
      year: y,
    });

    if (!summaries.length) {
      return res.status(404).json({
        message: "Nenhum resumo encontrado",
      });
    }

    let income = 0;
    let expense = 0;
    let balance = 0;

    summaries.forEach((s) => {
      income += s.income;
      expense += s.expense;
      balance += s.balance;
    });

    return res.json({
      summary: {
        income: Number(income.toFixed(2)),
        expense: Number(expense.toFixed(2)),
        balance: Number(balance.toFixed(2)),
      },
    });

  } catch (err) {
    console.error("Error fetching monthly summary:", err);
    return res.status(500).json({
      message: "Erro ao buscar o resumo mensal",
    });
  }
}