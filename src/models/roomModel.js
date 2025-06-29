const mongoose = require("mongoose");
const RoomSchema = new mongoose.Schema(
    {
        roomName: { type: String, required: true, unique: true },
        status: { type: Boolean, default: true },
    },
    { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Room", RoomSchema);
