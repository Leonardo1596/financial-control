import mongoose from 'mongoose';
import Transaction from '../models/TransactionModel.js';
import MonthlySummary from '../models/MonthlySummaryModel.js';

export async function calculateSummary({ userId, month, year, accountId }) {
    const m = Number(month);
    const y = Number(year);

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const accountObjectId = accountId
        ? new mongoose.Types.ObjectId(accountId)
        : null;

    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 0, 23, 59, 59));

    const matchFilter = {
        user: userObjectId,
        date: { $gte: start, $lte: end },
    };

    if (accountObjectId) {
        matchFilter.accountId = accountObjectId;
    }

    const result = await Transaction.aggregate([
        { $match: matchFilter },
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

    result.forEach((item) => {
        if (item._id === "income") income = item.total;
        if (item._id === "expense") expense = Math.abs(item.total);
    });

    const prevMonth = m === 1 ? 12 : m - 1;
    const prevYear = m === 1 ? y - 1 : y;

    let previousBalance = 0;

    const previousSummaryFilter = {
        user: userObjectId,
        month: prevMonth,
        year: prevYear,
    };

    if (accountObjectId) {
        previousSummaryFilter.account = accountObjectId;
    }

    const previousSummary = await MonthlySummary.findOne(previousSummaryFilter);

    if (previousSummary) {
        previousBalance = previousSummary.balance;
    } else {
        const pastMatchFilter = {
            user: userObjectId,
            date: { $lt: start },
        };

        if (accountObjectId) {
            pastMatchFilter.accountId = accountObjectId;
        }

        const pastTransactions = await Transaction.aggregate([
            { $match: pastMatchFilter },
            {
                $group: {
                    _id: null,
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

        previousBalance = pastTransactions[0]?.total || 0;
    }

    const balance = previousBalance + income - expense;

    return {
        previousBalance,
        income,
        expense,
        balance,
    };
}