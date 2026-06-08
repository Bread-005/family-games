function buildNavigationBar() {
    const navBar = document.createElement("nav");
    navBar.classList.add("navbar");

    for (let i = 0; i < 5; i++) {
        const anchor = document.createElement("a");
        if (i === 0) {
            anchor.textContent = "Game Collection";
            anchor.href = "index.html";
        }
        if (i === 1) {
            anchor.textContent = "Edit Games";
            anchor.href = "editCollection.html";
        }
        if (i === 2) {
            anchor.textContent = "Banlist";
            anchor.href = "banlist.html";
        }
        if (i === 3) {
            anchor.textContent = "Random Game Picker";
            anchor.href = "randomGame.html";
        }
        if (i === 4) {
            anchor.textContent = "Team Generator";
            anchor.href = "teams.html";
        }
        navBar.append(anchor);
    }
    document.body.prepend(navBar);
}

function showGameCollection(games) {
    const listDiv = document.getElementById("game-list");
    listDiv.innerHTML = "";
    games.sort((a, b) => a.number - b.number);

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

export {buildNavigationBar, showGameCollection};