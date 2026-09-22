const STORAGE_KEY = "family-games";

/**
 * Reads the shared family-games localStorage object.
 * @returns {object} The stored settings, or an empty object if nothing is stored yet.
 */
function getStorage() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
}

/**
 * Reads a single value from the shared family-games localStorage object.
 * @param {string} key - The property name to read.
 * @param {*} defaultValue - The value to return if the property is not set.
 * @returns {*} The stored value, or defaultValue if it is not set.
 */
function getStorageValue(key, defaultValue) {
    const storage = getStorage();
    return key in storage ? storage[key] : defaultValue;
}

/**
 * Writes a single value into the shared family-games localStorage object.
 * @param {string} key - The property name to write.
 * @param {*} value - The value to store.
 */
function setStorageValue(key, value) {
    const storage = getStorage();
    storage[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
}

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

/**
 * Displays a full-screen overlay asking the user for their name.
 * @param {(name: string) => void} onConfirm - Called with the trimmed name once confirmed.
 */
function showUserNameOverlay(onConfirm) {
    const overlay = document.createElement("div");
    overlay.id = "user-name-overlay";
    overlay.className = "user-name-overlay";

    const title = document.createElement("p");
    title.className = "user-name-overlay-title";
    title.textContent = "Wie heißt du?";
    overlay.append(title);

    const input = document.createElement("input");
    input.type = "text";
    input.id = "user-name-input";
    input.placeholder = "Dein Name";
    overlay.append(input);

    const confirmButton = document.createElement("button");
    confirmButton.className = "button-primary";
    confirmButton.textContent = "Bestätigen";
    overlay.append(confirmButton);

    function confirmName() {
        const name = input.value.trim();
        if (name === "") {
            return;
        }
        overlay.remove();
        onConfirm(name);
    }

    confirmButton.addEventListener("click", confirmName);
    input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            confirmName();
        }
    });

    document.body.append(overlay);
    input.focus();
}

/**
 * Displays the fixed top-right badge showing the current user's name with a rename option.
 * @param {string} name - The name to display.
 * @param {() => void} onRename - Called when the rename button is clicked.
 */
function showUserNameBadge(name, onRename) {
    const existingBadge = document.getElementById("user-name-badge");
    if (existingBadge) {
        existingBadge.remove();
    }

    const badge = document.createElement("div");
    badge.id = "user-name-badge";
    badge.className = "user-name-badge";

    const nameLabel = document.createElement("span");
    nameLabel.className = "user-name-label";
    nameLabel.textContent = name;
    badge.append(nameLabel);

    const renameButton = document.createElement("button");
    renameButton.className = "user-name-rename-button";
    renameButton.textContent = "Umbenennen";
    renameButton.addEventListener("click", onRename);
    badge.append(renameButton);

    document.body.append(badge);
}

/**
 * Ensures a user name is set: shows the overlay on first visit or after a rename,
 * otherwise renders the badge directly. Persists the name via setStorageValue.
 */
function initUserName() {
    function handleRename() {
        setStorageValue("userName", null);
        const badge = document.getElementById("user-name-badge");
        if (badge) {
            badge.remove();
        }
        showUserNameOverlay((name) => {
            setStorageValue("userName", name);
            showUserNameBadge(name, handleRename);
        });
    }

    const storedName = getStorageValue("userName", null);
    if (storedName) {
        showUserNameBadge(storedName, handleRename);
    } else {
        showUserNameOverlay((name) => {
            setStorageValue("userName", name);
            showUserNameBadge(name, handleRename);
        });
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

export {
    buildNavigationBar,
    showGameCollection,
    showLoadingScreen,
    hideLoadingScreen,
    getStorageValue,
    setStorageValue,
    initUserName,
};
