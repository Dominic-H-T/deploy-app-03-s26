const Transaction = require("../models/Transaction");

async function createTransaction(req, res) {
  try {
    const {
      creditCardNickname,
      cardType,
      date,
      amount,
      amendment,
      comment
    } = req.body;

    if (!creditCardNickname || !cardType || !date || amount === undefined) {
      return res.status(400).json({
        message: "creditCardNickname, cardType, date, and amount are required"
      });
    }

    const transaction = await Transaction.create({
      creditCardNickname,
      cardType,
      date,
      amount,
      amendment: amendment || false,
      comment: comment || "",
      createdBy: req.user._id
    });

    return res.status(201).json(transaction);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function getTransactions(req, res) {
  try {
    const filter = {};

    if (req.query.creditCardNickname) {
      filter.creditCardNickname = req.query.creditCardNickname;
    }

    if (req.query.cardType) {
      filter.cardType = req.query.cardType;
    }

    if (req.query.date) {
      const start = new Date(req.query.date);
      const end = new Date(req.query.date);
      end.setDate(end.getDate() + 1);

      filter.date = {
        $gte: start,
        $lt: end
      };
    }

    if (req.query.startDate || req.query.endDate) {
      filter.date = {};

      if (req.query.startDate) {
        filter.date.$gte = new Date(req.query.startDate);
      }

      if (req.query.endDate) {
        const end = new Date(req.query.endDate);
        end.setDate(end.getDate() + 1);
        filter.date.$lt = end;
      }
    }

    const transactions = await Transaction.find(filter)
      .populate("createdBy", "username role")
      .sort({ date: -1, createdAt: -1 });

    return res.json(transactions);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function getTransactionById(req, res) {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate("createdBy", "username role");

    if (!transaction) {
      return res.status(404).json({ message: "transaction not found" });
    }

    return res.json(transaction);
  } catch (error) {
    return res.status(400).json({ message: "invalid transaction id" });
  }
}

module.exports = {
  createTransaction,
  getTransactions,
  getTransactionById
};