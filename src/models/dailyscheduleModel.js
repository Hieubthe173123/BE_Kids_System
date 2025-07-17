const mongoose = require("mongoose");

const dailyScheduleSchema = new mongoose.Schema(
  {
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    time: { type: String, required: true }, // "08:00-08:30"
    curriculum: { type: mongoose.Schema.Types.ObjectId, ref: "Curriculum", required: true }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("DailySchedule", dailyScheduleSchema);
