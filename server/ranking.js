/**
 * Aggregates submitted rankings into a final result: a participant's 1st place earns
 * 1 point, 2nd place 2 points, and so on. The game with the lowest total points wins.
 * @param {string[]} games - The full list of game names in the room.
 * @param {{ranking: string[]}[]} submittedRankings - Rankings from participants who submitted.
 * @returns {{name: string, points: number}[]} Games sorted by total points, ascending.
 */
function calculateResults(games, submittedRankings) {
    const pointsByGame = new Map(games.map(game => [game, 0]));

    submittedRankings.forEach(({ ranking }) => {
        ranking.forEach((game, position) => {
            const points = position + 1;
            pointsByGame.set(game, pointsByGame.get(game) + points);
        });
    });

    return games
        .map(game => ({ name: game, points: pointsByGame.get(game) }))
        .sort((a, b) => a.points - b.points);
}

/**
 * Checks whether a ranking is a valid permutation of the room's games.
 * @param {string[]} games - The full list of game names in the room.
 * @param {string[]} ranking - The ranking submitted by a participant.
 * @returns {boolean} True if the ranking contains exactly the same games, each exactly once.
 */
function isValidRanking(games, ranking) {
    if (ranking.length !== games.length) {
        return false;
    }
    const sortedGames = [...games].sort();
    const sortedRanking = [...ranking].sort();
    return sortedGames.every((game, index) => game === sortedRanking[index]);
}

export { calculateResults, isValidRanking };
