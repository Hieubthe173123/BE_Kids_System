const mongoose = require("mongoose");
const enrollSchoolSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true },
    studentAge: { type: Number, required: true },
    studentDob: { type: Date, required: true },
    parentName: { type: String, required: true },
    IDCard: { type: String, required: true },
    address: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String, required: true },
    relationship: { type: String, required: true },
    reason: { type: String },
    note: { type: String }, // Note về sức khỏe
    state: {
      type: String,
      enum: ["Chờ xác nhận", "Chờ xử lý", "Hoàn thành", "Xử lý lỗi"],
      default: "Chờ xác nhận"
    }

  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("enrollSchool", enrollSchoolSchema);
