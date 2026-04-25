document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = "https://clocktower-homebrew-collection-13pz.onrender.com";
    let games = await fetch(API_URL + '/boardgames').then(res => res.json());

    games.sort((a, b) => (a.number || 0) - (b.number || 0));

    // Navigation Logic
    function showPage(pageId) {
        document.getElementById('add-section').classList.add('hidden');
        document.getElementById('filter-section').classList.add('hidden');
        document.getElementById(pageId).classList.remove('hidden');
        if (pageId === 'add-section') renderList();
    }
    document.getElementById("add-games-button").addEventListener('click', () => showPage("add-section"));
    document.getElementById("add-filter-button").addEventListener('click', () => showPage("filter-section"));

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
        const availableGames = games.filter(game => (game.minPlayers <= playerCount && game.maxPlayers >= playerCount || !playerCount) && game.maxTime <= maxTime);

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

    // Run render on load
    renderList();
});