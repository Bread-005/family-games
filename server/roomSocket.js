import { Int32 } from "mongodb";
import { isValidRanking } from "./ranking.js";
import { buildRoomState } from "./roomState.js";
import {
    getRoom,
    addParticipant,
    removeParticipant,
    deleteRoom,
    setParticipantRanking,
    setRoomGames,
    setRoomDraftGames,
    listOpenRooms,
} from "./roomStore.js";

const DISCONNECT_GRACE_PERIOD_MILLISECONDS = 2000;
const pendingParticipantLeaves = new Map();

/**
 * Wires up the Socket.IO events that keep all participants of a room in sync:
 * joining, submitting a ranking, and broadcasting the resulting room state.
 * Also keeps every connected client's room overview (rooms-list) up to date.
 * Room/participant state lives in memory (roomStore.js); MongoDB is only used
 * here to keep a persisted record of who ranked which games how, written once
 * a room's ranking is fully completed.
 * @param {import("socket.io").Server} io - The Socket.IO server.
 * @param {import("mongodb").Collection} rankingsCollection - Collection storing completed room results.
 */
function registerRoomSocketHandlers(io, rankingsCollection) {
    io.on("connection", (socket) => {
        socket.emit("rooms-list", listOpenRooms());

        socket.on("join-room", ({ roomCode, name }) => {
            if (!isNonEmptyString(roomCode) || !isNonEmptyString(name)) {
                socket.emit("room-error", "roomCode and name are required");
                return;
            }

            const room = getRoom(roomCode);
            if (!room) {
                socket.emit("room-error", "Room not found");
                return;
            }

            cancelPendingParticipantLeave(roomCode, name.trim());

            addParticipant(roomCode, name.trim());
            socket.data.roomCode = roomCode;
            socket.data.name = name.trim();
            socket.join(roomCode);
            io.to(roomCode).emit("room-state", buildRoomState(roomCode));
            io.emit("rooms-list", listOpenRooms());
        });

        socket.on("disconnect", () => {
            scheduleParticipantLeave(io, socket.data.roomCode, socket.data.name);
        });

        socket.on("leave-room", ({ roomCode, name }) => {
            if (!isNonEmptyString(roomCode) || !isNonEmptyString(name)) {
                return;
            }

            cancelPendingParticipantLeave(roomCode, name);
            handleParticipantLeave(io, roomCode, name);
            delete socket.data.roomCode;
            delete socket.data.name;
        });

        socket.on("preview-games", ({ roomCode, name, games }) => {
            const room = getRoom(roomCode);
            if (!room) {
                socket.emit("room-error", "Room not found");
                return;
            }

            if (room.creatorName !== name) {
                socket.emit("room-error", "Only the host can pick the games");
                return;
            }

            if (room.games !== null) {
                socket.emit("room-error", "Games have already been picked for this room");
                return;
            }

            if (!Array.isArray(games)) {
                socket.emit("room-error", "games must be an array");
                return;
            }

            setRoomDraftGames(roomCode, games);
            io.to(roomCode).emit("room-state", buildRoomState(roomCode));
        });

        socket.on("set-games", ({ roomCode, name, games }) => {
            const room = getRoom(roomCode);
            if (!room) {
                socket.emit("room-error", "Room not found");
                return;
            }

            if (room.creatorName !== name) {
                socket.emit("room-error", "Only the host can pick the games");
                return;
            }

            if (room.games !== null) {
                socket.emit("room-error", "Games have already been picked for this room");
                return;
            }

            if (!Array.isArray(games) || games.length < 2) {
                socket.emit("room-error", "At least 2 games are required");
                return;
            }

            setRoomGames(roomCode, games);
            io.to(roomCode).emit("room-state", buildRoomState(roomCode));
            io.emit("rooms-list", listOpenRooms());
        });

        socket.on("submit-ranking", async ({ roomCode, name, ranking }) => {
            const room = getRoom(roomCode);
            if (!room) {
                socket.emit("room-error", "Room not found");
                return;
            }

            if (room.games === null) {
                socket.emit("room-error", "Games have not been picked for this room yet");
                return;
            }

            const participant = room.participants.find(candidate => candidate.name === name);
            if (!participant) {
                socket.emit("room-error", "Participant has not joined this room");
                return;
            }

            if (!Array.isArray(ranking) || !isValidRanking(room.games, ranking)) {
                socket.emit("room-error", "ranking must contain every room game exactly once");
                return;
            }

            setParticipantRanking(roomCode, name, ranking);

            const roomState = buildRoomState(roomCode);
            if (roomState.isCompleted) {
                await persistRoomResult(rankingsCollection, room);
            }

            io.to(roomCode).emit("room-state", roomState);
            io.emit("rooms-list", listOpenRooms());
        });
    });
}

/**
 * Builds the lookup key used to track a participant's pending removal timer.
 * @param {string} roomCode - The room the participant belongs to.
 * @param {string} name - The participant's name.
 * @returns {string} The composite key identifying this participant within pendingParticipantLeaves.
 */
function buildPendingLeaveKey(roomCode, name) {
    return `${roomCode}:${name}`;
}

/**
 * Schedules a participant's removal after a short grace period instead of removing them
 * immediately. This absorbs a page reload, where the client's socket disconnects and a new
 * one reconnects (and rejoins) within a fraction of a second: cancelPendingParticipantLeave()
 * cancels the scheduled removal before it fires, so the reload is invisible to other
 * participants. A genuine leave (navigating away, closing the tab) has nothing left to cancel
 * it, so the removal proceeds once the grace period elapses.
 * @param {import("socket.io").Server} io - The Socket.IO server.
 * @param {string|undefined} roomCode - The room the disconnecting socket had joined, if any.
 * @param {string|undefined} name - The disconnecting participant's name, if any.
 */
function scheduleParticipantLeave(io, roomCode, name) {
    if (!roomCode || !name) {
        return;
    }

    const pendingLeaveKey = buildPendingLeaveKey(roomCode, name);
    cancelPendingParticipantLeave(roomCode, name);

    const leaveTimeout = setTimeout(() => {
        pendingParticipantLeaves.delete(pendingLeaveKey);
        handleParticipantLeave(io, roomCode, name);
    }, DISCONNECT_GRACE_PERIOD_MILLISECONDS);

    pendingParticipantLeaves.set(pendingLeaveKey, leaveTimeout);
}

/**
 * Cancels a participant's pending removal timer, if one is scheduled. Called when the
 * participant rejoins (e.g. after a page reload) before the grace period elapses.
 * @param {string} roomCode - The room the participant belongs to.
 * @param {string} name - The participant's name.
 */
function cancelPendingParticipantLeave(roomCode, name) {
    const pendingLeaveKey = buildPendingLeaveKey(roomCode, name);
    const pendingLeaveTimeout = pendingParticipantLeaves.get(pendingLeaveKey);
    if (pendingLeaveTimeout) {
        clearTimeout(pendingLeaveTimeout);
        pendingParticipantLeaves.delete(pendingLeaveKey);
    }
}

/**
 * Removes a participant from their room once their disconnect grace period has elapsed
 * without them rejoining. Dissolves the room once its last participant has left, otherwise
 * broadcasts the updated room state to whoever remains.
 * @param {import("socket.io").Server} io - The Socket.IO server.
 * @param {string|undefined} roomCode - The room the disconnecting socket had joined, if any.
 * @param {string|undefined} name - The disconnecting participant's name, if any.
 */
function handleParticipantLeave(io, roomCode, name) {
    if (!roomCode || !name) {
        return;
    }

    const room = getRoom(roomCode);
    if (!room) {
        return;
    }

    removeParticipant(roomCode, name);

    const remainingRoom = getRoom(roomCode);
    if (remainingRoom.participants.length === 0) {
        deleteRoom(roomCode);
    } else {
        io.to(roomCode).emit("room-state", buildRoomState(roomCode));
    }

    io.emit("rooms-list", listOpenRooms());
}

/**
 * Persists a completed room's result as one record: every game together with each
 * participant's ranked position for it. Logs but does not throw on failure, since this
 * is a persistence log and must not block the live ranking flow.
 * @param {import("mongodb").Collection} rankingsCollection - Collection storing completed room results.
 * @param {{games: string[], participants: {name: string, ranking: string[]}[]}} room - The completed room.
 */
async function persistRoomResult(rankingsCollection, room) {
    const document = {
        date: new Date(),
        games: room.games.map(game => ({
            name: game,
            rankings: room.participants.map(participant => ({
                name: participant.name,
                number: new Int32(participant.ranking.indexOf(game) + 1),
            })),
        })),
    };

    try {
        await rankingsCollection.insertOne(document);
    } catch (error) {
        console.error("Failed to persist room result", error);
    }
}

/**
 * Checks whether a value is a string containing at least one non-whitespace character.
 * @param {*} value - The value to check.
 * @returns {boolean} True if value is a non-empty string.
 */
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim() !== "";
}

export { registerRoomSocketHandlers };
