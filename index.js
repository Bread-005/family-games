import {
    buildNavigationBar,
    showGameCollection,
    showLoadingScreen,
    hideLoadingScreen,
    getStorageValue,
    setStorageValue,
    initUserName,
} from "./functions.js";

const ROOM_API_URL = "https://family-games-jaze.onrender.com";

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
    initUserName();
    buildNavigationBar();
    showLoadingScreen();

    const API_URL = "https://hobby-projects-api.onrender.com";
    let games = await fetch(API_URL + "/boardgames").then(res => res.json());
    let bannedGames = getStorageValue("bannedGames", []);

    hideLoadingScreen();

    // Game Collection page
    if (window.location.pathname.includes("index.html")) {
        const sortSelect = document.getElementById("sort-select");
        const savedSortKey = getStorageValue("gameSortKey", "first-added");
        sortSelect.value = savedSortKey;
        showGameCollection(sortGames(games, savedSortKey));

        sortSelect.addEventListener("change", (event) => {
            setStorageValue("gameSortKey", event.target.value);
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
                setStorageValue("bannedGames", bannedGames);
                renderBanlist();
                updateBanSelect();
            }
        });

        // unban game
        window.unbanGame = function(name) {
            bannedGames = bannedGames.filter(g => g !== name);
            setStorageValue("bannedGames", bannedGames);
            renderBanlist();
            updateBanSelect();
        };
        renderBanlist();
        updateBanSelect();
    }

    // Random Game Picker page (room lobby)
    if (window.location.pathname.includes("randomGame.html")) {
        document.getElementById("create-room-button").addEventListener("click", async () => {
            const creatorName = getStorageValue("userName", "Unbekannt");

            const response = await fetch(ROOM_API_URL + "/rooms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ creatorName }),
            });
            const room = await response.json();

            window.location.href = "room.html?code=" + room.roomCode;
        });

        function renderOpenRooms(openRooms) {
            const listElement = document.getElementById("open-rooms-list");
            listElement.innerHTML = "";

            if (openRooms.length === 0) {
                listElement.innerHTML = "<li>Momentan sind keine Räume offen.</li>";
                return;
            }

            openRooms.forEach(room => {
                const item = document.createElement("li");

                const label = document.createElement("span");
                label.textContent = `${room.creatorName} · ${room.gameCount} Spiele · ${room.participantCount} Mitspielende`;
                item.append(label);

                const joinButton = document.createElement("button");
                joinButton.className = "button-secondary";
                joinButton.textContent = "Beitreten";
                joinButton.addEventListener("click", () => {
                    window.location.href = "room.html?code=" + room.roomCode;
                });
                item.append(joinButton);

                listElement.append(item);
            });
        }

        const roomsOverviewSocket = io(ROOM_API_URL);
        roomsOverviewSocket.on("rooms-list", renderOpenRooms);
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

    // Room page
    if (window.location.pathname.includes("room.html")) {
        const roomCode = new URLSearchParams(window.location.search).get("code");
        const userName = getStorageValue("userName", "Unbekannt");
        const bannedGames = getStorageValue("bannedGames", []);
        let currentRanking = [];
        let pickedGames = [];
        let availableGames = [];
        let touchDraggedIndex = null;
        let touchStartClientY = null;
        let mouseDraggedIndex = null;
        let socket = null;

        function getAvailableGames() {
            const playerCount = parseInt(document.getElementById("room-filter-players").value) || 0;
            const maxTime = parseInt(document.getElementById("room-filter-time").value) || Infinity;

            return games.filter(game => (game.minPlayers <= playerCount && game.maxPlayers >= playerCount || !playerCount) &&
                game.maxTime <= maxTime && !bannedGames.includes(game.name) && !game.isCopy && !game.isExpansion);
        }

        function hideRoomSections() {
            document.getElementById("room-host-picker").hidden = true;
            document.getElementById("room-waiting-for-host").hidden = true;
            document.getElementById("room-ranking").hidden = true;
            document.getElementById("room-waiting").hidden = true;
            document.getElementById("room-results").hidden = true;
        }

        function showRoomError(message) {
            hideRoomSections();
            const errorElement = document.getElementById("room-error");
            errorElement.textContent = message;
            errorElement.hidden = false;
        }

        function pickRandomGame(pool, excludedNames) {
            const candidates = pool.filter(game => !excludedNames.includes(game.name));
            const source = candidates.length > 0 ? candidates : pool;
            return source[Math.floor(Math.random() * source.length)];
        }

        function renderPickedGames() {
            const resultsDiv = document.getElementById("room-pick-results");
            resultsDiv.innerHTML = "";

            pickedGames.forEach((game, index) => {
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
                    const excludedNames = pickedGames
                        .filter((pickedGame, pickedIndex) => pickedIndex !== index)
                        .map(pickedGame => pickedGame.name);
                    pickedGames[index] = pickRandomGame(availableGames, excludedNames);
                    renderPickedGames();
                    socket.emit("preview-games", {
                        roomCode,
                        name: userName,
                        games: pickedGames.map(pickedGame => pickedGame.name),
                    });
                });
                item.append(rerollButton);

                const gameName = document.createElement("strong");
                gameName.textContent = game.name;
                item.append(gameName);

                resultsDiv.appendChild(item);
            });

            document.getElementById("room-start-ranking-button").hidden = pickedGames.length === 0;
        }

        document.getElementById("room-pick-button").addEventListener("click", () => {
            availableGames = getAvailableGames();

            const shuffled = [...availableGames].sort(() => 0.5 - Math.random());
            pickedGames = shuffled.slice(0, 5);

            renderPickedGames();
            socket.emit("preview-games", {
                roomCode,
                name: userName,
                games: pickedGames.map(pickedGame => pickedGame.name),
            });
        });

        function reorderRanking(listElement, draggedIndex, targetIndex) {
            const items = Array.from(listElement.children);
            const draggedElement = items[draggedIndex];
            const targetElement = items[targetIndex];
            if (!draggedElement || !targetElement) {
                return;
            }
            if (draggedIndex < targetIndex) {
                targetElement.after(draggedElement);
            } else {
                targetElement.before(draggedElement);
            }

            const [draggedGame] = currentRanking.splice(draggedIndex, 1);
            currentRanking.splice(targetIndex, 0, draggedGame);

            Array.from(listElement.children).forEach((child, displayIndex) => {
                child.dataset.index = String(displayIndex);
                child.querySelector(".ranking-position").textContent = (displayIndex + 1) + ".";
            });
        }

        function renderRankingList() {
            const listElement = document.getElementById("room-ranking-list");
            listElement.innerHTML = "";

            currentRanking.forEach((game, index) => {
                const item = document.createElement("li");
                item.className = "ranking-item";
                item.draggable = true;
                item.dataset.index = String(index);

                const position = document.createElement("span");
                position.className = "ranking-position";
                position.textContent = (index + 1) + ".";
                item.append(position);

                const gameName = document.createElement("span");
                gameName.textContent = game;
                item.append(gameName);

                item.addEventListener("dragstart", (event) => {
                    mouseDraggedIndex = parseInt(item.dataset.index);
                    event.dataTransfer.setData("text/plain", String(mouseDraggedIndex));
                    item.classList.add("dragging");
                });
                item.addEventListener("dragend", () => {
                    item.classList.remove("dragging");
                    mouseDraggedIndex = null;
                });
                item.addEventListener("dragover", (event) => {
                    event.preventDefault();
                    if (mouseDraggedIndex === null) {
                        return;
                    }
                    const targetIndex = parseInt(item.dataset.index);
                    if (targetIndex === mouseDraggedIndex) {
                        return;
                    }
                    reorderRanking(listElement, mouseDraggedIndex, targetIndex);
                    mouseDraggedIndex = targetIndex;
                });
                item.addEventListener("drop", (event) => {
                    event.preventDefault();
                });

                item.addEventListener("touchstart", (event) => {
                    touchDraggedIndex = parseInt(item.dataset.index);
                    touchStartClientY = event.touches[0].clientY;
                    item.classList.add("dragging");
                    item.classList.add("touch-lifted");
                }, { passive: true });
                item.addEventListener("touchmove", (event) => {
                    if (touchDraggedIndex === null) {
                        return;
                    }
                    event.preventDefault();
                    const touch = event.touches[0];
                    const liftOffset = touch.clientY - touchStartClientY;
                    item.style.transform = `translateY(${liftOffset}px) scale(1.04)`;

                    const elementUnderTouch = document.elementFromPoint(touch.clientX, touch.clientY);
                    const targetItem = elementUnderTouch ? elementUnderTouch.closest(".ranking-item") : null;
                    if (!targetItem) {
                        return;
                    }
                    const targetIndex = parseInt(targetItem.dataset.index);
                    if (targetIndex === touchDraggedIndex) {
                        return;
                    }
                    reorderRanking(listElement, touchDraggedIndex, targetIndex);
                    touchDraggedIndex = targetIndex;
                    touchStartClientY = touch.clientY;
                }, { passive: false });
                item.addEventListener("touchend", () => {
                    item.classList.remove("touch-lifted");
                    item.classList.remove("dragging");
                    item.style.transform = "";
                    touchDraggedIndex = null;
                    touchStartClientY = null;
                });

                listElement.append(item);
            });
        }

        function renderWaitingForHostGames(draftGames) {
            const gamesDiv = document.getElementById("room-waiting-for-host-games");
            gamesDiv.innerHTML = "";

            (draftGames || []).forEach(gameName => {
                const item = document.createElement("div");
                item.className = "game-card";
                item.style.borderColor = "#9333ea";

                const nameElement = document.createElement("strong");
                nameElement.textContent = gameName;
                item.append(nameElement);

                gamesDiv.appendChild(item);
            });
        }

        function renderParticipants(participants) {
            const listElement = document.getElementById("room-participants-list");
            listElement.innerHTML = "";

            participants.forEach(participant => {
                const item = document.createElement("li");
                const nameSpan = document.createElement("span");
                nameSpan.textContent = participant.name;
                item.append(nameSpan);

                const statusSpan = document.createElement("span");
                statusSpan.textContent = participant.hasSubmitted ? "✅" : "⏳";
                item.append(statusSpan);

                listElement.append(item);
            });
        }

        function renderResults(results) {
            const listElement = document.getElementById("room-results-list");
            listElement.innerHTML = "";

            results.forEach(result => {
                const item = document.createElement("li");
                item.textContent = `${result.name} (${result.points} Punkte)`;
                listElement.append(item);
            });
        }

        function applyRoomState(roomState) {
            hideRoomSections();

            if (roomState.games === null) {
                const isHost = roomState.creatorName === userName;
                document.getElementById("room-host-picker").hidden = !isHost;
                document.getElementById("room-waiting-for-host").hidden = isHost;
                if (!isHost) {
                    renderWaitingForHostGames(roomState.draftGames);
                }
                return;
            }

            if (roomState.isCompleted) {
                document.getElementById("room-results").hidden = false;
                renderResults(roomState.results);
                return;
            }

            const participant = roomState.participants.find(candidate => candidate.name === userName);
            if (participant && participant.hasSubmitted) {
                document.getElementById("room-waiting").hidden = false;
                renderParticipants(roomState.participants);
                return;
            }

            document.getElementById("room-ranking").hidden = false;
            currentRanking = roomState.games;
            renderRankingList();
        }

        if (!roomCode) {
            showRoomError("Kein Raum-Code angegeben.");
        } else {
            socket = io(ROOM_API_URL);

            socket.on("connect", () => {
                socket.emit("join-room", { roomCode, name: userName });
            });

            socket.on("room-state", applyRoomState);
            socket.on("room-error", showRoomError);

            document.querySelectorAll(".navbar a").forEach((navigationLink) => {
                navigationLink.addEventListener("click", (event) => {
                    event.preventDefault();
                    socket.emit("leave-room", { roomCode, name: userName });
                    window.location.href = navigationLink.href;
                });
            });

            document.getElementById("room-start-ranking-button").addEventListener("click", () => {
                socket.emit("set-games", { roomCode, name: userName, games: pickedGames.map(game => game.name) });
            });

            document.getElementById("room-submit-ranking-button").addEventListener("click", () => {
                socket.emit("submit-ranking", { roomCode, name: userName, ranking: currentRanking });
            });
        }
    }
});