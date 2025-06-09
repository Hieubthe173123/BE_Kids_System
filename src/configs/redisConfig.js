const redis = require("redis");
require('dotenv').config();

const redisClient = redis.createClient({
    username: 'default',
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
        }
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Client Error (runtime):", err.message);
});

const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log("✅ Redis connected successfully!");
  } catch (error) {
    console.error("❌ Redis connection failed:", error.message);
    process.exit(1); 
  }
};

module.exports = {
  connectRedis,
  redisClient,
};
