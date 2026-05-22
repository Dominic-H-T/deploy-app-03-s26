const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    creditCardNickname: {
      type: String,
      required: true,
      trim: true
    },
    cardType: {
      type: String,
      required: true,
      enum: ["Visa", "Master", "Amex", "Discover", "Other"]
    },
    date: {
      type: Date,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    amendment: {
      type: Boolean,
      default: false
    },
    comment: {
      type: String,
      trim: true,
      default: ""
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;