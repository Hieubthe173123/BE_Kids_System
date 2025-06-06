const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const AccountSchema = new mongoose.Schema(
    {
        username: { type: String, required: true },
        password: { type: String, required: true },
        OTPnumber: { type: String },
        exprire_in: { type: Date },
        role: {
            type: String,
            required: true,
            enum: ["parent", "admin", "teacher", "principal"],
        },
        status: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false },
);

AccountSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});


module.exports = mongoose.model("Account", AccountSchema);
