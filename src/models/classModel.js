const mongoose = require("mongoose");
const ClassSchema = new mongoose.Schema(
    {
        teacher: { type: mongoose.Types.ObjectId, ref: "Teacher" },
        student: { type: mongoose.Types.ObjectId, ref: "Student" },
        schoolYear: { type: String, required: true },
        className: { type: String, required: true },
        classAge: { type: String, required: true },
        room: { type: String, required: true },
        status: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Class", ClassSchema);
