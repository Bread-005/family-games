import { Router } from "express";
import { generateRoomCode } from "./roomCode.js";
import { createRoom, roomCodeExists, listOpenRooms } from "./roomStore.js";

export { createRoomsRouter };

/**
 * Builds the Express router handling room creation. Joining a room and submitting
 * rankings happen over Socket.IO instead, see roomSocket.js.
 * @param {import("socket.io").Server} io - The Socket.IO server, used to broadcast the
 * updated room overview to everyone once a new room is created.
 * @returns {import("express").Router} The configured router.
 */
function createRoomsRouter(io) {
    const router = Router();

    router.post("/", (request, response) => {
        const { creatorName } = request.body;
        if (!isNonEmptyString(creatorName)) {
            response.status(400).json({ error: "creatorName is required" });
            return;
        }

        const roomCode = generateUniqueRoomCode();
        createRoom(roomCode, creatorName.trim());
        io.emit("rooms-list", listOpenRooms());

        response.status(201).json({ roomCode });
    });

    return router;
}

/**
 * Checks whether a value is a string containing at least one non-whitespace character.
 * @param {*} value - The value to check.
 * @returns {boolean} True if value is a non-empty string.
 */
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

/**
 * Generates a room code that is not currently in use.
 * @returns {string} A unique room code.
 */
function generateUniqueRoomCode() {
    let roomCode = generateRoomCode();
    while (roomCodeExists(roomCode)) {
        roomCode = generateRoomCode();
    }
    return roomCode;
}
