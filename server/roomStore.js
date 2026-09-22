export {
    createRoom,
    roomCodeExists,
    getRoom,
    addParticipant,
    removeParticipant,
    deleteRoom,
    setParticipantRanking,
    setRoomGames,
    setRoomDraftGames,
    listOpenRooms,
};

const ROOM_TTL_MILLISECONDS = 1000 * 60 * 60 * 24;
const CLEANUP_INTERVAL_MILLISECONDS = 1000 * 60 * 60;

const rooms = new Map();

/**
 * Creates a room in memory with its creator as the first participant. The games to be
 * ranked are not known yet — the creator (host) picks them later via setRoomGames().
 * @param {string} roomCode - The unique room code.
 * @param {string} creatorName - The name of the participant creating the room.
 */
function createRoom(roomCode, creatorName) {
    rooms.set(roomCode, {
        creatorName,
        games: null,
        draftGames: null,
        participants: [{ name: creatorName, ranking: null }],
        createdAt: Date.now(),
    });
}

/**
 * Checks whether a room code is already in use.
 * @param {string} roomCode - The room code to check.
 * @returns {boolean} True if a room with this code exists.
 */
function roomCodeExists(roomCode) {
    return rooms.has(roomCode);
}

/**
 * Reads a room's live state.
 * @param {string} roomCode - The room code to look up.
 * @returns {{creatorName: string, games: string[]|null, participants: {name: string, ranking: string[]|null}[], createdAt: number}|null}
 */
function getRoom(roomCode) {
    return rooms.get(roomCode) || null;
}

/**
 * Adds a participant to a room, unless a participant with the same name already joined.
 * @param {string} roomCode - The room to join.
 * @param {string} name - The participant's name.
 */
function addParticipant(roomCode, name) {
    const room = rooms.get(roomCode);
    if (!room) {
        return;
    }

    const alreadyJoined = room.participants.some(participant => participant.name === name);
    if (!alreadyJoined) {
        room.participants.push({ name, ranking: null });
    }
}

/**
 * Removes a participant from a room, e.g. after they disconnect.
 * @param {string} roomCode - The room to remove the participant from.
 * @param {string} name - The participant's name.
 */
function removeParticipant(roomCode, name) {
    const room = rooms.get(roomCode);
    if (!room) {
        return;
    }

    room.participants = room.participants.filter(participant => participant.name !== name);
}

/**
 * Deletes a room from memory, e.g. once its last participant has left.
 * @param {string} roomCode - The room to delete.
 */
function deleteRoom(roomCode) {
    rooms.delete(roomCode);
}

/**
 * Stores a participant's submitted ranking.
 * @param {string} roomCode - The room the participant is in.
 * @param {string} name - The participant's name.
 * @param {string[]} ranking - The submitted ranking.
 */
function setParticipantRanking(roomCode, name, ranking) {
    const room = rooms.get(roomCode);
    if (!room) {
        return;
    }

    const participant = room.participants.find(candidate => candidate.name === name);
    if (participant) {
        participant.ranking = ranking;
    }
}

/**
 * Sets the games to be ranked in a room, once its host has picked them.
 * @param {string} roomCode - The room to update.
 * @param {string[]} games - The games to be ranked in this room.
 */
function setRoomGames(roomCode, games) {
    const room = rooms.get(roomCode);
    if (!room) {
        return;
    }

    room.games = games;
}

/**
 * Stores the host's current, unconfirmed game picks so the other participants can watch
 * them live (read-only) while the host still picks and swaps games. Overwritten on every
 * pick/swap until the host confirms via setRoomGames(), which is unaffected by this.
 * @param {string} roomCode - The room to update.
 * @param {string[]} draftGames - The host's currently picked, not yet confirmed games.
 */
function setRoomDraftGames(roomCode, draftGames) {
    const room = rooms.get(roomCode);
    if (!room) {
        return;
    }

    room.draftGames = draftGames;
}

/**
 * Lists rooms that have not been completed yet, for display on the room overview.
 * @returns {{roomCode: string, creatorName: string, gameCount: number, participantCount: number}[]}
 */
function listOpenRooms() {
    const openRooms = [];
    for (const [roomCode, room] of rooms) {
        const isCompleted = room.games !== null && room.participants.length > 0 &&
            room.participants.every(participant => participant.ranking !== null);
        if (!isCompleted) {
            openRooms.push({
                roomCode,
                creatorName: room.creatorName,
                gameCount: room.games === null ? 0 : room.games.length,
                participantCount: room.participants.length,
            });
        }
    }
    return openRooms;
}

setInterval(() => {
    const now = Date.now();
    for (const [roomCode, room] of rooms) {
        if (now - room.createdAt > ROOM_TTL_MILLISECONDS) {
            rooms.delete(roomCode);
        }
    }
}, CLEANUP_INTERVAL_MILLISECONDS);
