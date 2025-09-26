const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  color: { type: String, default: "#4BC0C0" },
  icon: { type: String, default: "📁" },
  type: { 
    type: String, 
    enum: ["income", "expense"], 
    required: true 
  },
  isDefault: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Category", categorySchema);
