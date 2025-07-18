const { app } = require('@azure/functions');
const connectDB = require("../shared/mongoose");
const Room = require('../src/models/roomModel');

// Lấy tất cả phòng học
app.http('getAllRooms', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'room',
    handler: async (request, context) => {
        try {
            await connectDB();
            const rooms = await Room.find({ status: true });
            return { status: 200, jsonBody: rooms };
        } catch (error) {
            return { status: 500, jsonBody: { success: false, message: "Failed to retrieve rooms", error: error.message } };
        }
    }
});
