import { createServer } from "http";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { connectToDatabase } from "./db.js";
import { createRoomsRouter } from "./rooms.js";
import { registerRoomSocketHandlers } from "./roomSocket.js";

const PORT = process.env.PORT || 4000;
const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
};

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());
app.use("/rooms", createRoomsRouter(io));

connectToDatabase().then((database) => {
    registerRoomSocketHandlers(io, database.collection("rankings"));

    httpServer.listen(PORT, "0.0.0.0", () => {
        console.log("Access game on https://bread-005.github.io/family-games/index.html");
    });
});
