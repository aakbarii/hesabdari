const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["cash", "bank", "card", "savings"], 
    required: true 
  },
  balance: { type: Number, default: 0 },
  color: { type: String, default: "#4BC0C0" },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Account", accountSchema);
