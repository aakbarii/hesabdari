const mongoose = require("mongoose");
const moment = require("moment-jalaali"); // حتماً باید نصب باشه

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ["income", "expense"], required: true },
  amount: { type: Number, required: true },
  title: { type: String, required: true },
  description: String,
  category: String,
  date: {
    type: Date,
    default: () => new Date(),
  },
});

module.exports = mongoose.model("Transaction", transactionSchema);
