import { getRoom } from "./roomStore.js";

/**
 * Shapes a room's in-memory state into the payload sent to clients, including the frozen
 * results once the room has been completed. The results stay the same no matter which
 * participants are still in the room, since they were frozen at completion time.
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
    const isCompleted = room.results !== null;

    const roomState = {
        roomCode,
        creatorName: room.creatorName,
        games: room.games,
        draftGames: room.games === null ? room.draftGames : null,
        participants,
        isCompleted,
    };

    if (isCompleted) {
        roomState.results = room.results;
    }

    return roomState;
}

export { buildRoomState };
