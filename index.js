document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = "https://clocktower-homebrew-collection-13pz.onrender.com";
    let games = await fetch(API_URL + '/boardgames').then(res => res.json());
    let bannedGames = JSON.parse(localStorage.getItem('banned_games')) || [];

    games.sort((a, b) => (a.number || 0) - (b.number || 0));

    // Navigation Logic
    function showPage(pageId) {
        document.getElementById('add-section').classList.add('hidden');
        document.getElementById('filter-section').classList.add('hidden');
        document.getElementById('team-section').classList.add('hidden');
        document.getElementById('ban-section').classList.add('hidden');
        document.getElementById(pageId).classList.remove('hidden');
        if (pageId === 'add-section') renderList();
    }
    document.getElementById("add-games-button").addEventListener('click', () => showPage("add-section"));
    document.getElementById("add-filter-button").addEventListener('click', () => showPage("filter-section"));
    document.getElementById("team-generator-button").addEventListener('click', () => showPage("team-section"));
    document.getElementById("banlist-button").addEventListener('click', () => showPage("ban-section"));

    // --- Automatische Ausfüll-Logik mit Backup ---
    const nameInput = document.getElementById('game-name');
    const minInput = document.getElementById('min-players-input');
    const maxInput = document.getElementById('max-players-input');
    const minTimeInput = document.getElementById('min-game-time');
    const maxTimeInput = document.getElementById('max-game-time');

    // Hier speichern wir die manuellen Eingaben des Nutzers zwischen
    let userBackup = { min: "", max: "", minTime: "", maxTime: "" };
    let isAutoFilled = false;

    nameInput.addEventListener('input', () => {
        const enteredName = nameInput.value.trim().toLowerCase();
        const existingGame = games.find(game => game.name.toLowerCase() === enteredName);

        if (existingGame) {
            // Nur Backup erstellen, wenn wir nicht schon im Auto-Fill Modus sind
            if (!isAutoFilled) {
                userBackup = {
                    min: minInput.value,
                    max: maxInput.value,
                    minTime: minTimeInput.value,
                    maxTime: maxTimeInput.value
                };
            }

            // Felder mit Datenbank-Werten füllen
            minInput.value = existingGame.minPlayers;
            maxInput.value = existingGame.maxPlayers;
            minTimeInput.value = existingGame.minTime;
            maxTimeInput.value = existingGame.maxTime;

            isAutoFilled = true;
            showStatusMessage("Spiel bereits vorhanden – Daten wurden geladen.", nameInput);
            document.getElementById("save-to-database-button").textContent = "Update Game";
        } else {
            // Wenn der Name nicht mehr passt und wir vorher auto-gefüllt hatten:
            if (isAutoFilled) {
                // Backup zurückspielen
                minInput.value = userBackup.min;
                maxInput.value = userBackup.max;
                minTimeInput.value = userBackup.minTime;
                maxTimeInput.value = userBackup.maxTime;

                isAutoFilled = false;
            }
            document.getElementById("save-to-database-button").textContent = "Save to Database";
            removeStatusMessage();
        }
    });

    // Hilfsfunktionen für die Nachricht
    function showStatusMessage(text, element) {
        removeStatusMessage();
        const msg = document.createElement('p');
        msg.id = "status-message";
        msg.textContent = text;
        msg.style.color = "#9333ea";
        msg.style.fontSize = "0.8rem";
        msg.style.marginTop = "5px";
        element.parentNode.appendChild(msg);
    }

    function removeStatusMessage() {
        const oldMsg = document.getElementById('status-message');
        if (oldMsg) oldMsg.remove();
    }

    // Save Game Logic
    document.getElementById("save-to-database-button").addEventListener("click", async (event) => {
        event.preventDefault();

        const newGame = {
            number: games.length + 1,
            name: document.getElementById('game-name').value,
            minPlayers: parseInt(document.getElementById("min-players-input").value),
            maxPlayers: parseInt(document.getElementById("max-players-input").value),
            minTime: parseInt(document.getElementById("min-game-time").value),
            maxTime: parseInt(document.getElementById('max-game-time').value)
        };
        if (!newGame.name || !newGame.minPlayers || !newGame.maxPlayers || !newGame.minTime || !newGame.maxTime) {
            showStatusMessage("Du musst alle Input Felder ausfüllen!", document.getElementById("save-to-database-button"));
            return;
        }

        if (document.getElementById("save-to-database-button").textContent === "Update Game") {
            const game = newGame;
            delete game.id;
            await fetch(API_URL + '/boardgames/update/' + newGame.name, {
                method: "PUT",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(game)
            });
        }
        if (document.getElementById("save-to-database-button").textContent === "Save to Database") {
            await fetch(API_URL + '/boardgames/create', {
                method: "POST",
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(newGame)
            });
        }
        games = await fetch(API_URL + "/boardgames").then(res => res.json());
        nameInput.value = "";
        minInput.value = "";
        maxInput.value = "";
        minTimeInput.value = "";
        maxTimeInput.value = "";
        document.getElementById("save-to-database-button").textContent = "Save to Database";
        removeStatusMessage();
        renderList();
    });

    // Render the full list
    function renderList() {
        const listDiv = document.getElementById("game-list");
        listDiv.innerHTML = "";

        games.forEach(game => {
            const item = document.createElement('div');
            item.className = "game-card";
            const gameName = document.createElement("strong");
            gameName.textContent = game.name;
            item.append(gameName);
            const p = document.createElement("p");
            p.style.fontSize = "0.8rem";
            p.style.color = "a1a1aa";
            if (game.minPlayers === game.maxPlayers) {
                p.textContent = game.minPlayers;
            } else {
                p.textContent = game.minPlayers + "-" + game.maxPlayers;
            }
            p.textContent += " Spieler | ";
            if (game.minTime === game.maxTime) {
                p.textContent += game.minTime;
            } else {
                p.textContent += game.minTime + " - " + game.maxTime;
            }
            p.textContent += " min";
            item.append(p);
            listDiv.appendChild(item);
        });
    }

    // pick 5 random games
    document.getElementById("pick-random-games-button").addEventListener("click", () => {
        const playerCount = parseInt(document.getElementById("filter-players").value) || 0;
        const maxTime = parseInt(document.getElementById('filter-time').value) || Infinity;

        // 1. Filter based on user input
        const availableGames = games.filter(game => (game.minPlayers <= playerCount && game.maxPlayers >= playerCount || !playerCount) &&
            game.maxTime <= maxTime && !bannedGames.includes(game.name));

        // 2. Shuffle the filtered list
        const shuffled = availableGames.sort(() => 0.5 - Math.random());

        // 3. Take first 5
        const selected = shuffled.slice(0, 5);

        const resultsDiv = document.getElementById('random-results');
        resultsDiv.innerHTML = '';

        if (selected.length === 0) {
            resultsDiv.innerHTML = '<p>No games match those settings.</p>';
            return;
        }

        selected.forEach(game => {
            const item = document.createElement('div');
            item.className = 'game-card';
            item.style.borderColor = '#9333ea';
            item.innerHTML = `<strong>${game.name}</strong>`;
            resultsDiv.appendChild(item);
        });
    });

    // 2. Team-Generator Logik
    document.getElementById("generate-teams-btn").addEventListener("click", () => {
        const input = document.getElementById("player-names").value;
        // Namen splitten, Trimmen (Leerzeichen entfernen) und leere Einträge filtern
        let players = input.split(',').map(name => name.trim()).filter(name => name !== "");

        if (players.length < 2) {
            alert("Bitte gib mindestens 2 Namen ein!");
            return;
        }

        players.sort(() => Math.random() - 0.5);

        // --- Anzeige Zugreihenfolge ---
        document.getElementById("turn-order-list").innerHTML = players.map((p, i) => `
           <div style="background: #27272a; margin-bottom: 5px; padding: 5px 15px; border-radius: 4px;">
             <span style="color: #9333ea; font-weight: bold; margin-right: 10px;">${i + 1}.</span> ${p}
           </div>
        `).join('');

        // --- Teams aufteilen ---
        const teamBlue = [];
        const teamRed = [];

        players.forEach((player, index) => {
            // Abwechselnd aufteilen (Index 0, 2, 4... Team Blau | 1, 3, 5... Team Rot)
            if (index % 2 === 0) {
                teamBlue.push(player);
            } else {
                teamRed.push(player);
            }
        });

        // --- Anzeige Teams ---
        document.getElementById("team-blue-list").innerHTML = teamBlue.map(p => `<li style="padding: 5px 0; border-bottom: 1px solid #333;">${p}</li>`).join('');
        document.getElementById("team-red-list").innerHTML = teamRed.map(p => `<li style="padding: 5px 0; border-bottom: 1px solid #333;">${p}</li>`).join('');
    });

    // Dropdown mit allen verfügbaren Spielen füllen
    function updateBanSelect() {
        const select = document.getElementById('ban-select');
        // Nur Spiele zeigen, die noch NICHT gebannt sind
        const available = games.filter(g => !bannedGames.includes(g.name));

        select.innerHTML = available.map(g => `<option value="${g.name}">${g.name}</option>`).join('');
    }

    // Banliste rendern
    function renderBanlist() {
        const listDiv = document.getElementById('banned-games-list');
        listDiv.innerHTML = '';

        if (bannedGames.length === 0) {
            listDiv.innerHTML = '<p style="color: #a1a1aa;">Keine Spiele gebannt.</p>';
            return;
        }

        bannedGames.forEach(gameName => {
            const item = document.createElement('div');
            item.className = 'game-card';
            item.style.borderColor = '#ef4444'; // Rot für gebannt
            item.innerHTML = `
            <strong>${gameName}</strong>
            <button onclick="unbanGame('${gameName}')" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem; display:block; margin-top:5px;">Entbannen</button>
        `;
            listDiv.appendChild(item);
        });
    }

    // Spiel bannen
    document.getElementById('add-to-ban-btn').addEventListener('click', () => {
        const selectedName = document.getElementById('ban-select').value;
        if (selectedName && !bannedGames.includes(selectedName)) {
            bannedGames.push(selectedName);
            localStorage.setItem('banned_games', JSON.stringify(bannedGames));
            renderBanlist();
            updateBanSelect();
        }
    });

    // Spiel entbannen (Global machen für das onclick im HTML)
    window.unbanGame = function(name) {
        bannedGames = bannedGames.filter(g => g !== name);
        localStorage.setItem('banned_games', JSON.stringify(bannedGames));
        renderBanlist();
        updateBanSelect();
    };

    // Run render on load
    renderList();
    renderBanlist();
    updateBanSelect();
});