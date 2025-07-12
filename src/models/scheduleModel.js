const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
    {
        time: { type: String, required: true },
        fixed: { type: Boolean, required: true },
        curriculum: {
            type: mongoose.Types.ObjectId,
            ref: "Curriculum",
            required: true,
        },
    },
    { _id: false }
);

const scheduleSchema = new mongoose.Schema(
    {
        class: { type: mongoose.Types.ObjectId, ref: "Class", required: true },
        schoolYear: { type: String, required: true },
        schedule: {
            Monday: [activitySchema],
            Tuesday: [activitySchema],
            Wednesday: [activitySchema],
            Thursday: [activitySchema],
            Friday: [activitySchema],
        },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Schedule", scheduleSchema);
