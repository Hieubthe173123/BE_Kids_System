const { createClient } = require('redis');
require('dotenv').config();

const connectRedis = async () => {
    const client = createClient({
        username: 'default',
        password: process.env.REDIS_PASSWORD,
        socket: {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
        }
    });

    client.on('error', err => console.error('Redis Client Error', err));

    try {
        await client.connect();
        console.log('🚀 Redis connected');
        
        await client.set('foo', 'bar');
        const result = await client.get('foo');
        console.log('Redis test:', result);
        
        module.exports.redisClient = client;
    } catch (error) {
        console.error('🚀 Redis connection failed:', error);
    }
};

module.exports.connectRedis = connectRedis;
