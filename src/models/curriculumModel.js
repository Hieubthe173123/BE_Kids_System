const mongoose = require("mongoose");
const CurriculumSchema = new mongoose.Schema(
    {
        curriculumCode: {type: String, required: true, unique: true},
        activityName: {type: String, required: true},
        activityFixed: {type: Boolean, default: false},
        age: {type: Number, required: true},
        activityNumber: {type: Number},
        status: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Curriculum", CurriculumSchema);
