import fs from "fs";
import ofx from "ofx";
import Transaction from "../models/TransactionModel.js";

export const importOfx = async (path, userId) => {
  const content = fs.readFileSync(path, "utf8");
  const data = ofx.parse(content);

  const transactions = data.OFX.BANKMSGSRSV1
    .STMTTRNRS.STMTRS.BANKTRANLIST.STMTTRN;

  const formatted = transactions.map((t) => ({
    user: userId,
    description: t.MEMO || t.NAME,
    amount: Math.abs(Number(t.TRNAMT)),
    type: Number(t.TRNAMT) > 0 ? "income" : "expense",
    date: new Date(t.DTPOSTED.slice(0, 8))
  }));

  await Transaction.insertMany(formatted);
  fs.unlinkSync(path);

  return formatted.length;
};
