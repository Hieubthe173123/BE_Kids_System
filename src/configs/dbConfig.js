const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    const user = process.env.MONGO_USER;
    const pass = process.env.MONGO_PASS;
    const host = process.env.MONGO_HOST;
    const dbName = process.env.MONGO_DB;

    const uri = `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority`;

    try {
        await mongoose.connect(uri);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error("❌ MongoDB connection failed: ", error);
        process.exit(1);
    }
};

module.exports = connectDB;
