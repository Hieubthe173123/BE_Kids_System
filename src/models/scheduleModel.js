const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
    {
        time: { type: String, required: true },
        curriculum: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Curriculum",
            required: true,
        },
    },
    { _id: false }
);

const DayScheduleSchema = new mongoose.Schema(
    {
        day: { type: String, required: true }, // e.g. "Monday"
        activities: [ActivitySchema],
    },
    { _id: false }
);

const ScheduleSchema = new mongoose.Schema(
    {
        class: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Class",
            required: true,
        }, // hoặc ref tới bảng Class nếu có
        schedule: [DayScheduleSchema],
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Schedule", ScheduleSchema);
