const mongoose = require('mongoose');
let cachedDb = null;

/**
 * Connects to MongoDB using the Singleton Pattern to reuse the connection.
 * If a connection already exists, it will be reused. Otherwise, a new connection will be created.
 * @returns {Promise<mongoose.Connection>} Mongoose connection object.
 */
const connectDB = async () => {
    if (cachedDb && mongoose.connection.readyState === 1) {
        console.log('=> Using existing MongoDB connection');
        return cachedDb;
    }

    const MONGO_URI = process.env.MONGO_URI;
    const MONGO_NAME = process.env.MONGO_NAME;

    if (!MONGO_URI || !MONGO_NAME) {
        console.error('Error: MONGO_URI or MONGO_NAME is not defined in environment variables.');
        throw new Error('MongoDB URI or Database Name is not defined.');
    }

    try {
        // useNewUrlParser & useUnifiedTopology không còn cần thiết với mongoose >= 6
        const client = await mongoose.connect(MONGO_URI, {
            dbName: MONGO_NAME,
            ssl: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        cachedDb = client.connection;
        console.log(`=> Established new MongoDB connection to database: "${MONGO_NAME}"`);
        return cachedDb;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        cachedDb = null;
        throw error;
    }
};

module.exports = connectDB;