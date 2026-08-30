# family-games

A personal board game collection manager. Vanilla JS frontend, no build step — open the HTML files directly in a browser or serve statically.

## Architecture

All pages share a single entry point (`index.js`) loaded as an ES module. Page-specific logic is gated by `window.location.pathname`. Shared UI helpers live in `functions.js`.

```
index.html          — Game collection with sort filter
editCollection.html — Add / update games in the database
banlist.html        — Ban games from the random picker
randomGame.html     — Random game suggestions based on player count & time
teams.html          — Random turn order and team splitter
functions.js        — buildNavigationBar(), showGameCollection()
index.js            — All page logic + parseDateDE(), sortGames()
style.css           — Single stylesheet with nested CSS (modern browser required)
```

## API

Base URL: `https://hobby-projects-api.onrender.com`

| Method | Path                        | Purpose          |
|--------|-----------------------------|------------------|
| GET    | `/boardgames`               | Fetch all games  |
| POST   | `/boardgames/create`        | Add a new game   |
| PUT    | `/boardgames/update/:name`  | Update by name   |

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

## LocalStorage keys

| Key              | Value                                              |
|------------------|----------------------------------------------------|
| `banned_games`   | JSON array of game name strings                    |
| `game_sort_key`  | Active sort option (`"first-added"`, `"alphabet"`, `"playerCount"`, `"minTime"`, `"maxTime"`, `"releaseDate"`, `"firstPlayedDate"`) |

## Execution environment

Never run `npm`, `npx`, or similar tooling directly on the host — always run inside Docker.
