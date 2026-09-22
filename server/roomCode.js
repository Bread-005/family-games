export { generateRoomCode };

const ROOM_CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 5;

/**
 * Generates a random, human-friendly room code. Ambiguous characters (0/O, 1/I) are excluded.
 * @returns {string} A room code, e.g. "K7QRT".
 */
function generateRoomCode() {
    let roomCode = "";
    for (let index = 0; index < ROOM_CODE_LENGTH; index++) {
        const randomIndex = Math.floor(Math.random() * ROOM_CODE_CHARACTERS.length);
        roomCode += ROOM_CODE_CHARACTERS[randomIndex];
    }
    return roomCode;
}
