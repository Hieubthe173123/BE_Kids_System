const mongoose = require("mongoose");
const CurriculumSchema = new mongoose.Schema(
    {
        curriculumCode: {type: String, required: true, unique: true},
        activityName: {type: String, required: true},
        activityFixed: {type: Boolean, default: false},
        age: {type: String, required: true},
        activityNumber: {type: Number},
        status: { type: Boolean, default: true },
        startTime: { type: String },
        endTime: { type: String }
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Curriculum", CurriculumSchema);
