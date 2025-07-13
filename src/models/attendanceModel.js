// models/Attendance.js
const mongoose = require("mongoose");

const AttendanceSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },

    date: { type: String, required: true }, // yyyy-mm-dd
    status: {
      type: String,
      enum: ["present", "absent", "sick", "leave"],
      required: true,
    },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    note: { type: String },
  },
  { timestamps: true, versionKey: false }
);

AttendanceSchema.index({ classId: 1, studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", AttendanceSchema);
