import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
}

declare global {
    var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const opts = {
    bufferCommands: false,
    dbName: 'interviewSupport'
};

async function dbConnect() {
    if (cached.conn) {
        // Checking if the cached connection is using the wrong database
        const dbName = cached.conn.connection.name;
        if (dbName === 'test') {
            console.log("Debug: Detected wrong DB 'test' in cache. Disconnecting manually to switch to 'interviewSupport'...");
            await cached.conn.disconnect();
            cached.conn = null;
            cached.promise = null;
        } else {
            return cached.conn;
        }
    }

    if (!cached.promise) {
        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((conn) => {
            return conn;
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
