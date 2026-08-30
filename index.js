import {buildNavigationBar, showGameCollection} from "./functions.js";

function parseDateDE(dateString) {
    if (!dateString) {
        return new Date(0);
    }
    const parts = dateString.split(".");
    if (parts[0] === "xx") {
        parts[0] = "15";
    }
    if (parts[1] === "xx") {
        parts[1] = "6";
    }
    if (dateString === "never") {
        return new Date(2000, 0, 1);
    }
    if (parts.length !== 3) {
        return new Date(0);
    }
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

function sortGames(games, sortKey) {
    const sorted = [...games];
    if (sortKey === "first-added") {
        // database adding order
    } else if (sortKey === "alphabet") {
        sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === "playerCount") {
        sorted.sort((a, b) => (a.minPlayers || 0) - (b.minPlayers || 0));
    } else if (sortKey === "minTime") {
        sorted.sort((a, b) => (a.minTime || 0) - (b.minTime || 0));
    } else if (sortKey === "maxTime") {
        sorted.sort((a, b) => (a.maxTime || 0) - (b.maxTime || 0));
    } else if (sortKey === "releaseDate") {
        sorted.sort((a, b) => parseDateDE(a.releaseDate) - parseDateDE(b.releaseDate));
    } else if (sortKey === "firstPlayedDate") {
        sorted.sort((a, b) => parseDateDE(a.firstPlayedDate) - parseDateDE(b.firstPlayedDate));
    } else {
        sorted.sort((a, b) => (a.number || 0) - (b.number || 0));
    }
    return sorted;
}

document.addEventListener("DOMContentLoaded", async () => {
    buildNavigationBar();

    const API_URL = "https://hobby-projects-api.onrender.com";
    let games = await fetch(API_URL + "/boardgames").then(res => res.json());
    let bannedGames = JSON.parse(localStorage.getItem("banned_games")) || [];

    // Game Collection page
    if (window.location.pathname.includes("index.html")) {
        const sortSelect = document.getElementById("sort-select");
        const savedSortKey = localStorage.getItem("game_sort_key") || "first-added";
        sortSelect.value = savedSortKey;
        showGameCollection(sortGames(games, savedSortKey));

        sortSelect.addEventListener("change", (event) => {
            localStorage.setItem("game_sort_key", event.target.value);
            showGameCollection(sortGames(games, event.target.value));
        });
    }

    // Banlist page
    if (window.location.pathname.includes("banlist.html")) {
        function updateBanSelect() {
            const select = document.getElementById("ban-select");
            const available = games.filter(g => !bannedGames.includes(g.name));

            select.innerHTML = available.map(g => `<option value="${g.name}">${g.name}</option>`).join("");
        }

        function renderBanlist() {
            const listDiv = document.getElementById("banned-games-list");
            listDiv.innerHTML = "";

            if (bannedGames.length === 0) {
                listDiv.innerHTML = '<p style="color: #a1a1aa;">Keine Spiele gebannt.</p>';
                return;
            }

            bannedGames.forEach(gameName => {
                const item = document.createElement('div');
                item.className = "game-card";
                item.style.borderColor = '#ef4444';
                item.innerHTML = `
            <strong>${gameName}</strong>
            <button onclick="unbanGame('${gameName}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem; display:block; margin-top:5px;">Entbannen</button>
        `;
                listDiv.appendChild(item);
            });
        }

        // ban game
        document.getElementById("add-to-ban-btn").addEventListener('click', () => {
            const selectedName = document.getElementById("ban-select").value;
            if (selectedName && !bannedGames.includes(selectedName)) {
                bannedGames.push(selectedName);
                localStorage.setItem("banned_games", JSON.stringify(bannedGames));
                renderBanlist();
                updateBanSelect();
            }
        });

        // unban game
        window.unbanGame = function(name) {
            bannedGames = bannedGames.filter(g => g !== name);
            localStorage.setItem("banned_games", JSON.stringify(bannedGames));
            renderBanlist();
            updateBanSelect();
        };
        renderBanlist();
        updateBanSelect();
    }

    // Random Game Picker page
    if (window.location.pathname.includes("randomGame.html")) {
        let availableGames = [];
        let selectedGames = [];

        function pickRandomGame(pool, excludedNames) {
            const candidates = pool.filter(game => !excludedNames.includes(game.name));
            const source = candidates.length > 0 ? candidates : pool;
            return source[Math.floor(Math.random() * source.length)];
        }

        function renderRandomResults() {
            const resultsDiv = document.getElementById("random-results");
            resultsDiv.innerHTML = "";

            if (selectedGames.length === 0) {
                resultsDiv.innerHTML = '<p>No games match those settings.</p>';
                return;
            }

            selectedGames.forEach((game, index) => {
                const item = document.createElement("div");
                item.className = "game-card";
                item.style.borderColor = "#9333ea";
                item.style.flexDirection = "row";
                item.style.justifyContent = "flex-start";
                item.style.gap = "0.75rem";

                const rerollButton = document.createElement("button");
                rerollButton.textContent = "🔁";
                rerollButton.title = "Spiel neu auswürfeln";
                rerollButton.style.background = "none";
                rerollButton.style.border = "none";
                rerollButton.style.color = "#9333ea";
                rerollButton.style.cursor = "pointer";
                rerollButton.style.fontSize = "1.2rem";
                rerollButton.addEventListener("click", () => {
                    const excludedNames = selectedGames
                        .filter((selectedGame, selectedIndex) => selectedIndex !== index)
                        .map(selectedGame => selectedGame.name);
                    selectedGames[index] = pickRandomGame(availableGames, excludedNames);
                    renderRandomResults();
                });
                item.append(rerollButton);

                const gameName = document.createElement("strong");
                gameName.textContent = game.name;
                item.append(gameName);

                resultsDiv.appendChild(item);
            });
        }

        document.getElementById("pick-random-games-button").addEventListener("click", () => {
            const playerCount = parseInt(document.getElementById("filter-players").value) || 0;
            const maxTime = parseInt(document.getElementById("filter-time").value) || Infinity;

            // 1. Filter based on user input
            availableGames = games.filter(game => (game.minPlayers <= playerCount && game.maxPlayers >= playerCount || !playerCount) &&
                game.maxTime <= maxTime && !bannedGames.includes(game.name) && !game.isCopy && !game.isExpansion);

            // 2. Shuffle the filtered list
            const shuffled = [...availableGames].sort(() => 0.5 - Math.random());

            // 3. Take first 5
            selectedGames = shuffled.slice(0, 5);

            renderRandomResults();
        });
    }

    // Team Generator page
    if (window.location.pathname.includes("teams.html")) {
        document.getElementById("generate-teams-btn").addEventListener("click", () => {
            const input = document.getElementById("player-names").value;
            const players = input.split(",").map(name => name.trim()).filter(name => name !== "");

            if (players.length < 2) {
                alert("Bitte gib mindestens 2 Namen ein!");
                return;
            }

            players.sort(() => Math.random() - 0.5);

            document.getElementById("turn-order-list").innerHTML = players.map((p, i) => `
               <div style="background: #27272a; margin-bottom: 5px; padding: 5px 15px; border-radius: 4px;">
                 <span style="color: #9333ea; font-weight: bold; margin-right: 10px;">${i + 1}.</span> ${p}
               </div>
            `).join("");

            const teamBlue = [];
            const teamRed = [];

            players.forEach((player, index) => {
                if (index % 2 === 0) {
                    teamBlue.push(player);
                } else {
                    teamRed.push(player);
                }
            });
            document.getElementById("team-blue-list").innerHTML = teamBlue.map(p => `<li style="padding: 5px 0; border-bottom: 1px solid #333;">${p}</li>`).join('');
            document.getElementById("team-red-list").innerHTML = teamRed.map(p => `<li style="padding: 5px 0; border-bottom: 1px solid #333;">${p}</li>`).join('');
        });
    }
});