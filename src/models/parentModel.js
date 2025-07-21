const mongoose = require("mongoose");
const ParentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    dob: { type: Date, required: true },
    phoneNumber: { type: String, required: true},
    email: {type: String},
    IDCard: {type: String, required: true},
    gender: { type: String, enum: ["male", "female", "other"] },
    account: { type: mongoose.Types.ObjectId, ref: "Account" },
    student: [{ type: mongoose.Types.ObjectId, ref: "Student"}],
    address: { type: String, required: true },
    status: { type: Boolean, default: true},
    image: { type: String}
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Parent", ParentSchema);
