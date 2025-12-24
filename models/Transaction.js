const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['income', 'expense', 'transfer'], required: true },
  amount: { type: Number, required: true },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);
