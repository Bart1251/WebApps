"use strict";
var TileState;
(function (TileState) {
    TileState[TileState["Default"] = 0] = "Default";
    TileState[TileState["DefaultFlagged"] = 1] = "DefaultFlagged";
    TileState[TileState["RevealedFlagged"] = 2] = "RevealedFlagged";
    TileState[TileState["DefaultQuestionMark"] = 3] = "DefaultQuestionMark";
    TileState[TileState["RevealedQuestionMark"] = 4] = "RevealedQuestionMark";
    TileState[TileState["RevealedMine"] = 5] = "RevealedMine";
    TileState[TileState["RevealedNotMine"] = 6] = "RevealedNotMine";
    TileState[TileState["RevealedMineExpolsion"] = 7] = "RevealedMineExpolsion";
    TileState[TileState["RevealedNumber"] = 8] = "RevealedNumber";
    TileState[TileState["RevealedEmpty"] = 9] = "RevealedEmpty";
})(TileState || (TileState = {}));
const presets = [
    { id: 0, boardSizeX: 9, boardSizeY: 9, mineCount: 10, tileScale: "1" },
    { id: 1, boardSizeX: 16, boardSizeY: 16, mineCount: 40, tileScale: "0.75" },
    { id: 2, boardSizeX: 30, boardSizeY: 16, mineCount: 99, tileScale: "0.5" },
];
let settings = presets[0];
const boardData = [];
const boardTiles = [];
let safeMove = true;
let minesLeft = 10;
let tilesLeft = 81;
let time = 0;
let timeInterval = 0;
function init() {
    document.querySelectorAll(".board-size-selector button").forEach((button) => button.addEventListener("click", changeBoardSize));
    document.querySelector("#board-size-selection .board-size-selector button")?.classList.add("active");
    document.querySelectorAll(".play").forEach((button) => button.addEventListener("click", startGame));
    document.querySelectorAll(".leaderboard").forEach((button) => button.addEventListener("click", showLeaderboard));
    document.querySelectorAll(".main-menu").forEach((button) => button.addEventListener("click", showMainMenu));
    showPage("start-page");
}
function changeBoardSize(e) {
    const button = e.currentTarget;
    settings = presets[Number(button.value)];
    document.querySelectorAll(".board-size-selector button").forEach((button) => button.classList.remove("active"));
    button.classList.add("active");
    displayLeaderboardData();
}
function showPage(id) {
    clearInterval(timeInterval);
    const pages = document.querySelectorAll(".page");
    for (let page of pages) {
        if (page.id === id)
            page.classList.remove("hidden");
        else
            page.classList.add("hidden");
    }
}
function showMainMenu() {
    document.querySelectorAll("#board-size-selection .board-size-selector button").forEach((button) => button.classList.remove("active"));
    document.querySelector("#board-size-selection .board-size-selector button")?.classList.add("active");
    settings = presets[0];
    showPage("start-page");
}
function showLeaderboard() {
    document.querySelectorAll("#leaderboard-board-size-selection .board-size-selector button").forEach((button) => button.classList.remove("active"));
    document.querySelector("#leaderboard-board-size-selection .board-size-selector button")?.classList.add("active");
    settings = presets[0];
    showPage("leaderboard-page");
    displayLeaderboardData();
}
function displayLeaderboardData() {
    const list = document.querySelector("#leaderboard-list");
    if (!list)
        return;
    list.innerHTML = "";
    const localStorageLeaderboardString = localStorage.getItem("leaderboard_" + settings.id) ?? "[]";
    const leaderboardData = JSON.parse(localStorageLeaderboardString);
    for (let score of leaderboardData) {
        const scoreListItem = document.createElement("li");
        scoreListItem.innerHTML = score.toString().padStart(3, '0');
        list.appendChild(scoreListItem);
    }
    for (let i = 0; i < 10 - leaderboardData.length; i++) {
        const scoreListItemEmpty = document.createElement("li");
        scoreListItemEmpty.innerHTML = "<span><span>-</span><span>-</span><span>-</span></span>";
        list.appendChild(scoreListItemEmpty);
    }
}
function endOfGameReveal() {
    for (let i = 0; i < settings.boardSizeY; i++) {
        for (let j = 0; j < settings.boardSizeX; j++) {
            const tile = boardData[i][j];
            if (tile.hasMine && tile.state === TileState.Default && tilesLeft !== settings.mineCount) {
                tile.state = TileState.RevealedMine;
                updateTileImage(j, i);
            }
            else if (!tile.hasMine && tile.state === TileState.DefaultFlagged) {
                tile.state = TileState.RevealedNotMine;
                updateTileImage(j, i);
            }
            else if (tile.hasMine && tile.state === TileState.Default) {
                tile.state = TileState.DefaultFlagged;
                updateTileImage(j, i);
            }
        }
    }
}
function showMessage(message, won) {
    const messageDisplay = document.querySelector("#message");
    if (!messageDisplay)
        return;
    messageDisplay.innerHTML = message;
    messageDisplay.classList.add(won ? "won" : "lost", "show");
    setTimeout(() => {
        messageDisplay.classList.remove("show", "won", "lost");
    }, 5000);
}
function revealTile(x, y) {
    const tile = boardData[y][x];
    if (tile.hasMine) {
        if (safeMove) {
            tile.hasMine = false;
            while (true) {
                const newX = Math.floor(Math.random() * settings.boardSizeX);
                const newY = Math.floor(Math.random() * settings.boardSizeY);
                if (!(newX === x && newY === y) && !boardData[newY][newX].hasMine) {
                    boardData[newY][newX].hasMine = true;
                    countNearMines();
                    revealTile(x, y);
                    break;
                }
            }
        }
        else {
            tile.state = TileState.RevealedMineExpolsion;
            showMessage("YOU LOSE!", false);
            endOfGameReveal();
            clearInterval(timeInterval);
            const board = document.querySelector("#board");
            board?.removeEventListener("click", handleLeftClick);
            board?.removeEventListener("contextmenu", handleRightClick);
        }
    }
    else if (tile.minesNear) {
        tile.state = TileState.RevealedNumber;
        tilesLeft--;
    }
    else {
        tile.state = TileState.RevealedEmpty;
        tilesLeft--;
        revealSurrounding(x, y);
    }
    updateTileImage(x, y);
}
function updateTileImage(x, y) {
    const tile = boardTiles[y][x];
    switch (boardData[y][x].state) {
        case TileState.DefaultFlagged:
            tile.src = "./img/tile_default_flag.png";
            break;
        case TileState.RevealedEmpty:
            tile.src = "./img/tile_revealed.png";
            break;
        case TileState.DefaultQuestionMark:
            tile.src = "./img/tile_default_question_mark.png";
            break;
        case TileState.RevealedFlagged:
            tile.src = "./img/tile_revealed_flag.png";
            break;
        case TileState.RevealedMine:
            tile.src = "./img/tile_revealed_mine.png";
            break;
        case TileState.RevealedMineExpolsion:
            tile.src = "./img/tile_revealed_mine_explosion.png";
            break;
        case TileState.RevealedNotMine:
            tile.src = "./img/tile_revealed_not_mine.png";
            break;
        case TileState.RevealedNumber:
            tile.src = "./img/tile_" + boardData[y][x].minesNear + ".png";
            break;
        case TileState.RevealedQuestionMark:
            tile.src = "./img/tile_revealed_question_mark.png";
            break;
        case TileState.Default:
            tile.src = "./img/tile_default.png";
            break;
    }
}
function revealSurrounding(x, y) {
    const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (let offset of offsets) {
        const newY = y + offset[0];
        const newX = x + offset[1];
        if (newY > -1 && newY < settings.boardSizeY &&
            newX > -1 && newX < settings.boardSizeX &&
            boardData[newY][newX].state === TileState.Default) {
            revealTile(newX, newY);
        }
    }
}
function handleLeftClick(e) {
    const tileImg = e.target.closest(".board-tile");
    if (!tileImg)
        return;
    e.preventDefault();
    const x = Number(tileImg.dataset.x);
    const y = Number(tileImg.dataset.y);
    function checkFlag(x, y) {
        return boardData[y][x].state === TileState.DefaultFlagged;
    }
    const tile = boardData[y][x];
    if (tile.state === TileState.Default) {
        if (safeMove)
            timeInterval = setInterval(() => {
                time++;
                updateTime();
            }, 1000);
        revealTile(x, y);
        safeMove = false;
    }
    else if (tile.state === TileState.RevealedNumber) {
        if (checkAround(x, y, checkFlag) === tile.minesNear) {
            revealSurrounding(x, y);
        }
    }
    if (tilesLeft === settings.mineCount) {
        showMessage("YOU WIN!", true);
        clearInterval(timeInterval);
        endOfGameReveal();
        const board = document.querySelector("#board");
        board?.removeEventListener("click", handleLeftClick);
        board?.removeEventListener("contextmenu", handleRightClick);
        saveScore();
    }
}
function saveScore() {
    const localStorageLeaderboardString = localStorage.getItem("leaderboard_" + settings.id) ?? "[]";
    const leaderboardData = JSON.parse(localStorageLeaderboardString);
    leaderboardData.push(time);
    leaderboardData.sort((a, b) => a - b);
    if (leaderboardData.length > 10)
        leaderboardData.pop();
    localStorage.setItem("leaderboard_" + settings.id, JSON.stringify(leaderboardData));
}
function handleRightClick(e) {
    const tileImg = e.target.closest(".board-tile");
    if (!tileImg)
        return;
    e.preventDefault();
    const x = Number(tileImg.dataset.x);
    const y = Number(tileImg.dataset.y);
    const tile = boardData[y][x];
    switch (tile.state) {
        case TileState.Default:
            tile.state = TileState.DefaultFlagged;
            minesLeft--;
            updateMineCount();
            break;
        case TileState.DefaultFlagged:
            tile.state = TileState.DefaultQuestionMark;
            minesLeft++;
            updateMineCount();
            break;
        case TileState.DefaultQuestionMark:
            tile.state = TileState.Default;
            updateMineCount();
            break;
    }
    updateTileImage(x, y);
}
function layMines() {
    let minesToLay = settings.mineCount;
    while (minesToLay) {
        const x = Math.floor(Math.random() * settings.boardSizeX);
        const y = Math.floor(Math.random() * settings.boardSizeY);
        if (!boardData[y][x].hasMine) {
            boardData[y][x].hasMine = true;
            minesToLay--;
        }
    }
}
function checkAround(x, y, check) {
    let count = 0;
    const offsets = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    for (let offset of offsets) {
        const newY = y + offset[0];
        const newX = x + offset[1];
        if (newY > -1 && newY < settings.boardSizeY &&
            newX > -1 && newX < settings.boardSizeX &&
            check(newX, newY))
            count++;
    }
    return count;
}
function countNearMines() {
    function checkMine(x, y) {
        return boardData[y][x].hasMine;
    }
    for (let i = 0; i < settings.boardSizeY; i++) {
        for (let j = 0; j < settings.boardSizeX; j++) {
            boardData[i][j].minesNear = checkAround(j, i, checkMine);
        }
    }
}
function initBoardData() {
    boardData.length = 0;
    for (let i = 0; i < settings.boardSizeY; i++) {
        const rowData = [];
        for (let j = 0; j < settings.boardSizeX; j++) {
            rowData.push({
                hasMine: false,
                state: TileState.Default,
                minesNear: 0
            });
        }
        boardData.push(rowData);
    }
    layMines();
    countNearMines();
}
function createBoardDOM() {
    const board = document.querySelector("#board");
    boardTiles.length = 0;
    if (!board)
        return;
    board.innerHTML = "";
    for (let i = 0; i < settings.boardSizeY; i++) {
        const row = document.createElement("div");
        row.classList.add("board-row");
        const rowTiles = [];
        for (let j = 0; j < settings.boardSizeX; j++) {
            const tile = document.createElement("img");
            tile.classList.add("board-tile");
            tile.src = "./img/tile_default.png";
            tile.dataset.x = j.toString();
            tile.dataset.y = i.toString();
            rowTiles.push(tile);
            row.appendChild(tile);
        }
        board.appendChild(row);
        boardTiles.push(rowTiles);
    }
    board.addEventListener("click", handleLeftClick);
    board.addEventListener("contextmenu", handleRightClick);
}
function updateMineCount() {
    const minesLeftDisplay = document.querySelector("#mines-left span");
    if (minesLeftDisplay)
        minesLeftDisplay.innerHTML = Math.max(minesLeft, 0).toString().padStart(2, '0');
}
function updateTime() {
    const timeDispay = document.querySelector("#time span");
    if (timeDispay)
        timeDispay.innerHTML = time.toString().padStart(3, '0');
}
function startGame(e) {
    document.querySelector("#message")?.classList.remove("show", "won", "lost");
    showPage("board-page");
    safeMove = true;
    minesLeft = settings.mineCount;
    tilesLeft = settings.boardSizeX * settings.boardSizeY;
    time = 0;
    document.querySelector(":root")?.style.setProperty("--tile-scale", settings.tileScale);
    updateTime();
    updateMineCount();
    initBoardData();
    createBoardDOM();
}
init();
