const mongoose = require("mongoose");
const StudentSchema = new mongoose.Schema(
  {
    studentCode: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other"] },
    address: { type: String, required: true },
    status: { type: Boolean, default: true },
    age: { type: Number, required: true },
    image: { type: String },
    note: { type: String },

  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Student", StudentSchema);
