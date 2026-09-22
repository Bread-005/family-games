import { calculateResults } from "./ranking.js";
import { getRoom } from "./roomStore.js";

/**
 * Shapes a room's in-memory state into the payload sent to clients, including
 * results once every participant has submitted their ranking.
 * @param {string} roomCode - The room code to load.
 * @returns {{roomCode: string, creatorName: string, games: string[]|null, draftGames: string[]|null, participants: {name: string, hasSubmitted: boolean}[], isCompleted: boolean, results?: {name: string, points: number}[]}|null}
 */
function buildRoomState(roomCode) {
    const room = getRoom(roomCode);
    if (!room) {
        return null;
    }

    const participants = room.participants.map(participant => ({
        name: participant.name,
        hasSubmitted: participant.ranking !== null,
    }));
    const isCompleted = room.games !== null && participants.length > 0 &&
        participants.every(participant => participant.hasSubmitted);

    const roomState = {
        roomCode,
        creatorName: room.creatorName,
        games: room.games,
        draftGames: room.games === null ? room.draftGames : null,
        participants,
        isCompleted,
    };

    if (isCompleted) {
        roomState.results = calculateResults(room.games, room.participants);
    }

    return roomState;
}

export { buildRoomState };
