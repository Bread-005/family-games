# family-games

A personal board game collection manager. Vanilla JS frontend, no build step — open the HTML files directly in a browser or serve statically.

## Architecture

All pages share a single entry point (`index.js`) loaded as an ES module. Page-specific logic is gated by `window.location.pathname`. Shared UI helpers live in `functions.js`.

```
index.html          — Game collection with sort filter
banlist.html        — Ban games from the random picker
randomGame.html     — Random game suggestions based on player count & time
teams.html          — Random turn order and team splitter
functions.js        — buildNavigationBar(), showGameCollection(), showLoadingScreen(), hideLoadingScreen(), getStorageValue(), setStorageValue(), initUserName()
index.js            — All page logic + parseDateDE(), sortGames()
style.css           — Single stylesheet with nested CSS (modern browser required)
server/             — Node.js/Express backend for ranking rooms, see below
```

## Boardgames API

Base URL: `https://hobby-projects-api.onrender.com`

| Method | Path           | Purpose          |
|--------|----------------|------------------|
| GET    | `/boardgames`  | Fetch all games  |

Read-only. There are no `create`/`update` endpoints for boardgames.

### Game object

```json
{
  "_id": "69e5c7282236ff053593e26e",
  "number": 60,
  "name": "Colt Express",
  "minPlayers": 2,
  "maxPlayers": 11,
  "minTime": 30,
  "maxTime": 45,
  "releaseDate": "01.10.2014",
  "firstPlayedDate": "25.12.2014",
  "isCopy": false,
  "isExpansion": false
}
```

Dates are stored as strings in `DD.MM.YYYY` format. `parseDateDE()` in `index.js` handles two special values:
- `"xx"` in the day or month position → substituted with `15` / `6` (mid-year estimate)
- `"never"` as the full string → treated as `2000-01-01` (sorts to the front)

## LocalStorage

All settings live under a single localStorage key, `family-games`, holding one JSON object.
Read/write individual properties via `getStorageValue(key, defaultValue)` / `setStorageValue(key, value)`
in `functions.js` — never touch `localStorage` directly.

| Property         | Value                                              |
|------------------|----------------------------------------------------|
| `bannedGames`     | JSON array of game name strings                    |
| `gameSortKey`     | Active sort option (`"first-added"`, `"alphabet"`, `"playerCount"`, `"minTime"`, `"maxTime"`, `"releaseDate"`, `"firstPlayedDate"`) |
| `userName`        | Display name entered via the `initUserName()` overlay/badge; `null` until set |

## Ranking rooms (server/)

A separate Node.js/Express backend (native `mongodb` driver, no ORM) lets multiple users rank
5 games together. A room starts without games: the host (the participant who created it) picks
them inside `room.html` using the player count / time filters, then sends them to the server via
`set-games`. Only after that do the ranking, waiting, and results views apply to a room — every
other participant sees a "waiting for host" screen until then. The server's source lives in
`server/`, but `package.json`, `Dockerfile`, and `docker-compose.yml` live at the project root —
the Docker build context is the whole repo so the Dockerfile can copy `server/*.js`. Started via
`docker compose up` from the project root (spins up MongoDB alongside the API) for local
development. The frontend connects to it via `ROOM_API_URL` in `index.js`, currently hardcoded
to the deployed Render URL, `https://family-games-jaze.onrender.com` — switch it back to
`http://localhost:4000` when developing against a local server.

Live room/participant state (who joined, who submitted) lives entirely in memory
(`server/roomStore.js`, a `Map` cleaned up after 24h). MongoDB (`server/db.js`) is only used
to persist completed rooms — it plays no role in the live coordination, which happens purely
over Socket.IO (`server/roomSocket.js`), not REST polling. Ranking aggregation
(`server/ranking.js`) sums each game's position across all participants — 1st place gives
1 point, 2nd place 2 points, and so on; the game with the lowest total wins. Games are sorted
ascending by total points once every participant has submitted.

Once a room's last participant submits, one document is written to the `rankings` collection
with the room's completion time and, for every game, each participant's ranked position for it:

```js
{
  date: ISODate("2026-08-30T18:42:11.000Z"),
  games: [
    { name: "Spinderella", rankings: [{ name: "Papa", number: 4 }, { name: "Mama", number: 1 }] },
    // ...
  ],
}
```

`date` is a real `Date` (exact completion timestamp), and each `number` is stored as a BSON
`Int32` (`server/roomSocket.js` wraps it via the `mongodb` package's `Int32`).

Restarting the server loses all in-progress rooms (in-memory only) but never loses results
of rooms that had already completed before the restart.

| Method | Path      | Purpose                                        |
|--------|-----------|--------------------------------------------------|
| POST   | `/rooms`  | Create an empty room `{ creatorName }` → `{ roomCode }` |

| Socket.IO event    | Direction        | Purpose                                                        |
|---------------------|------------------|-----------------------------------------------------------------|
| `join-room`         | client → server  | `{ roomCode, name }` — joins the room, idempotent per name      |
| `set-games`         | client → server  | `{ roomCode, name, games }` — host only, once per room, requires at least 2 games |
| `submit-ranking`    | client → server  | `{ roomCode, name, ranking }` — must be a permutation of the room's games, games must already be set |
| `room-state`        | server → room    | Broadcast after every join/set-games/submit: `{ roomCode, creatorName, games, participants, isCompleted, results? }`; `games` is `null` until the host picks them |
| `rooms-list`        | server → everyone | Broadcast on connect and after every create/join/set-games/submit: array of `{ roomCode, creatorName, gameCount, participantCount }` for rooms not yet completed (`gameCount` is `0` before the host picks games) |
| `room-error`        | server → client  | Error message string (room not found, invalid ranking, etc.)    |

`randomGame.html` and `room.html` both load the Socket.IO client from `https://cdn.socket.io`.
There is no manual room-code entry: `randomGame.html` shows the live list of open rooms
(`rooms-list`) with a join button per room; `roomCode` is only used internally (URL param,
Socket.IO room name) to address a room. No REST polling anywhere — everything is pushed.

## Execution environment

Never run `npm`, `npx`, or similar tooling directly on the host — always run inside Docker.
For the `server/` backend, use `docker compose up` (from the project root) rather than `npm start`.
