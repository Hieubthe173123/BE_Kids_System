const mongoose = require('mongoose');

const mealItemSchema = new mongoose.Schema({
  dishName: { type: String },
  description: String,
  calories: Number,
  imageUrl: String,
});

const dailyMenuSchema = new mongoose.Schema({
  date: { type: Date, required: true }, // ngày cụ thể
  breakfast: [mealItemSchema],
  lunch: [mealItemSchema],
  dinner: [mealItemSchema],
  note: String,
});

const weeklyMenuSchema = new mongoose.Schema({
  weekStart: { type: Date, unique: true }, // ví dụ: Thứ 2 của tuần
  dailyMenus: [dailyMenuSchema],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('WeeklyMenu', weeklyMenuSchema);