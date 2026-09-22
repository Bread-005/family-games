import { MongoClient } from "mongodb";

let cachedDatabase = null;

/**
 * Connects to MongoDB and caches the database handle for reuse across requests.
 * Only used to persist submitted rankings for the record — live room/participant
 * state lives in memory, see roomStore.js.
 * @returns {Promise<import("mongodb").Db>} The connected database.
 */
async function connectToDatabase() {
    if (cachedDatabase) {
        return cachedDatabase;
    }

    const connectionString = "mongodb+srv://" + process.env.DATABASE_USERNAME + ":" + process.env.DATABASE_PASSWORD + "@clocktowergames.hfnkicc.mongodb.net/?retryWrites=true&w=majority";
    const client = new MongoClient(connectionString);
    await client.connect();
    cachedDatabase = client.db("Misc");

    return cachedDatabase;
}

export { connectToDatabase };
