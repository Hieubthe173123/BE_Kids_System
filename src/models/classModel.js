const mongoose = require("mongoose");
const ClassSchema = new mongoose.Schema(
    {
        teacher: [{ type: mongoose.Types.ObjectId, ref: "Teacher" }],
        students: [{ type: mongoose.Types.ObjectId, ref: "Student" }],
        schoolYear: { type: String },
        className: { type: String },
        classAge: { type: String },
        room: { type: mongoose.Types.ObjectId, ref: "Room" },
        // room: { type: String },
        status: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Class", ClassSchema);
