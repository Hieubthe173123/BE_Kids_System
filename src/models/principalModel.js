const mongoose = require("mongoose");
const PrincipalSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        dob: { type: Date, required: true },
        phoneNumber: { type: Number },
        email: { type: String },
        IDCard: { type: String, required: true },
        gender: { type: String, enum: ["male", "female", "other"] },
        account: { type: mongoose.Types.ObjectId, ref: "Account", required: true },
        address: { type: String },
        status: { type: Boolean, default: true },
        image: { type: String }
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Principal", PrincipalSchema);
