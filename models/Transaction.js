const mongoose = require("mongoose");
const moment = require("moment-jalaali");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ["income", "expense", "transfer"], required: true },
  amount: { type: Number, required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' }, // برای انتقال
  date: {
    type: Date,
    default: () => new Date(),
  },
  tags: [String], // برچسب‌های اضافی
  isRecurring: { type: Boolean, default: false },
  recurringType: { type: String, enum: ["daily", "weekly", "monthly", "yearly"] }
});

module.exports = mongoose.model("Transaction", transactionSchema);
