const Room = require("../models/roomModel");

exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ status: true });
        res.status(200).json(rooms);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to retrieve rooms",
            error: error.message,
        });
    }
}