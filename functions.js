function showLoadingScreen() {
    const overlay = document.createElement("div");
    overlay.id = "loading-screen";
    overlay.className = "loading-screen";

    const spinner = document.createElement("div");
    spinner.className = "loading-spinner";
    overlay.append(spinner);

    const loadingText = document.createElement("p");
    loadingText.className = "loading-text";
    loadingText.textContent = "Auf Server warten...";
    overlay.append(loadingText);

    document.body.append(overlay);
}

function hideLoadingScreen() {
    const overlay = document.getElementById("loading-screen");
    if (overlay) {
        overlay.remove();
    }
}

function buildNavigationBar() {
    const navBar = document.createElement("nav");
    navBar.classList.add("navbar");

    for (let i = 0; i < 4; i++) {
        const anchor = document.createElement("a");
        if (i === 0) {
            anchor.textContent = "Spielesammlung";
            anchor.href = "index.html";
        }
        if (i === 1) {
            anchor.textContent = "Bann-Liste";
            anchor.href = "banlist.html";
        }
        if (i === 2) {
            anchor.textContent = "Zufallsgenerator";
            anchor.href = "randomGame.html";
        }
        if (i === 3) {
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

export {buildNavigationBar, showGameCollection, showLoadingScreen, hideLoadingScreen};
