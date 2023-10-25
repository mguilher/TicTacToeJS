const X_CLASS = 'x';
const CIRCLE_CLASS = 'circle';
const WINNING_COMBINATIONS = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];


let nextId = 1;
let GAMES = [];
let player;
let IsHostGame = false;
let hostKey;
let socket;
let PLAYERS = [];
let APIKEY;


function getGameById(id) {
    if (id === null || id === undefined) return null;
    let nId = new Number(id);
    if (GAMES === null || GAMES === undefined) return null;
    return GAMES.find((g) => g.Id == nId);
}

function getGameByName(p1, p2) {
    if (p1 === null || p1 === undefined || p2 === null || p2 === undefined) return null;
    if (GAMES === null || GAMES == undefined) return null;
    return GAMES.find((g) => (g.Player1 === p1 && g.Player2 === p2) || (g.Player1 === p2 && g.Player2 === p1));
}

function getPlayerBYName(name) {
    if (name == null || name == undefined) return null;
    if (PLAYERS === null || PLAYERS == undefined) return null;
    return PLAYERS.find((n) => n.Name == name);
}


function randomString(length, chars) {
    var mask = '';
    if (chars.indexOf('a') > -1) mask += 'abcdefghijklmnopqrstuvwxyz';
    if (chars.indexOf('A') > -1) mask += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.indexOf('#') > -1) mask += '0123456789';
    if (chars.indexOf('!') > -1) mask += '~`!@#$%^&*()_+-={}[]:";\'<>?,./|\\';
    var result = '';
    for (var i = length; i > 0; --i) result += mask[Math.floor(Math.random() * mask.length)];
    return result;
}

function handleReceiver(eventdata) {
    let obj = JSON.parse(eventdata);
    console.log(obj);
    if (obj.HostGame == hostKey && obj.User != player) {
        if (obj.Action == "adduser" && IsHostGame == true) {
            addGame(obj.User);
        }
        else if (obj.Action == "move" && obj.UserTarget == player) {
            addMove(obj.Id, obj.IdCell, obj.User);
        }
        else if (obj.Action == "loadjoin" && obj.UserTarget == player) {
            loadJoin(obj);
        }
        else if (obj.Action == "reset" && obj.UserTarget == player) {
            reset(obj.Id);
        }
        else if (obj.Action == "newjoin" && obj.UserTarget == player) {
            newJoin(obj);
        }
        else if (obj.Action == "reconectgame" && obj.UserTarget == player) {
            ReconectJoin(obj);
        }
        else if (obj.Action == "serverreconect" && IsHostGame == false) {
            clearClient();
        }
        else if (obj.Action == "ranking" && obj.UserTarget == player) {
            PLAYERS = obj.Players;
            bindRanking();
        }
        else if (obj.Action == "endgame" && (IsHostGame == true || obj.UserTarget == player)) {
            changeGame(obj);
        }

    }
    else {
        console.log("Msg minha");
    }
}

function startSocket(message) {
    socket = new WebSocket("wss://libwebsockets.org/testserver");//wss://socketsbay.com/wss/v2/1/demo/");

    // Connection opened
    socket.addEventListener("open", (event) => {
        if (message != undefined) {
            socket.send(message);
        } else {
            socket.send("Hello Server!");
        }

    });

    // Listen for messages
    socket.addEventListener("message", (event) => {
        console.log("Message from server ", event.data);

        if (event.data.indexOf("{") >= 0) {
            handleReceiver(event.data);
        } else {
            console.log("Data não json");
        }
    });

    socket.addEventListener("close", (event) => {
        console.log("The connection has been closed successfully.");

        let btncopyKey = document.getElementById('reconect');
        btncopyKey.classList.remove("d-none");
        btncopyKey.classList.add("d-block");

    });

    socket.addEventListener("error", (event) => {
        console.log("WebSocket error: ", event);

        let btncopyKey = document.getElementById('reconect');
        btncopyKey.classList.remove("d-none");
        btncopyKey.classList.add("d-block");
    });
}

let channel;

function sartably(message) {
    const ably = new Ably.Realtime.Promise(APIKEY);
    ably.connection.once('connected');
    console.log('Connected to Ably!');


    // get the channel to subscribe to
    channel = ably.channels.get('quickstart');

    /*
      Subscribe to a channel.
      The promise resolves when the channel is attached
      (and resolves synchronously if the channel is already attached).
    */
    channel.subscribe('greeting', (message) => {
        console.log('Received a greeting message in realtime: ' + message.data)
        if (message.data.indexOf("{") >= 0) {
            handleReceiver(message.data);
        } else {
            console.log("Data não json");
        }
    });

    if (message) {
        sendData(message);
    } else {
        sendData("hello! gordo");
    }
}

function startSendData(message) {
    sartably(message);
}

function sendData(data) {
    channel.publish('greeting', data);
    console.log('sendData : ' + data)
}

function sartHost() {
    var txt = document.getElementById('username');
    var txtAPIKey = document.getElementById('apikey');
    if (txt.value != undefined && txt.value != '' && txtAPIKey.value != undefined && txtAPIKey.value != '') {
        player = txt.value;
        hostKey = randomString(6, 'A');
        IsHostGame = true;
        APIKEY=txtAPIKey.value;
        let newUser = { Name: player, NumberOfVictories: 0, NumberOfDefeats: 0 };
        PLAYERS.push(newUser);

        showInfoHost();
        startSendData();
    }

}

function joinHost() {
    var txtUsername = document.getElementById('username');
    var txtHostkey = document.getElementById('hostkey');
    var txtAPIKey = document.getElementById('apikey');
    if (txtUsername.value != undefined && txtUsername.value != '' && txtHostkey.value != undefined && txtHostkey.value != '' && txtAPIKey.value != undefined && txtAPIKey.value != '') {
        player = txtUsername.value;
        var txtHostkey = document.getElementById('hostkey');
        hostKey = txtHostkey.value;
        APIKEY=txtAPIKey.value;
        IsHostGame = false;
        showInfoHost();
        console.log("joinHost", player, hostKey);
        startSendData(JSON.stringify({ HostGame: hostKey, Action: "adduser", User: player }));
        let newUser = { Name: player, NumberOfVictories: 0, NumberOfDefeats: 0 };
        PLAYERS.push(newUser);
    }
}

function loadJoin(obj) {
    if (obj != undefined && obj != null) {
        let game = { Player1: obj.User, Player2: player, Player1Key: X_CLASS, Player2Key: CIRCLE_CLASS, Id: obj.Id, PlayerTurn: player, Cells: obj.Cells, IsFirstMove: false, Cells: obj.Cells };
        GAMES.push(game);
        buildBord(game.Id, game.Player1, player);
        setBoardHoverClass(game.Id, CIRCLE_CLASS);
        bindCells(game.Id, game.Cells);
    }

}

function addGame(outerPlayer) {
    let hasUser = getPlayerBYName(outerPlayer);
    if (player != undefined && player != '' && hasUser == null) {
        let obj = { Player1: player, Player2: outerPlayer, Player1Key: X_CLASS, Player2Key: CIRCLE_CLASS, Id: nextId, PlayerTurn: player, Cells: ['', '', '', '', '', '', '', '', ''], IsFirstMove: true };
        GAMES.push(obj);
        buildBord(nextId, player, outerPlayer);
        setBoardHoverClass(nextId, X_CLASS);
        nextId++;
        if (PLAYERS != null && PLAYERS.length >= 2) {
            for (let i = 0; i < PLAYERS.length; i++) {
                if (PLAYERS[i].Name != player) {
                    let newgame = { Player1: PLAYERS[i].Name, Player2: outerPlayer, Player1Key: X_CLASS, Player2Key: CIRCLE_CLASS, Id: nextId, PlayerTurn: PLAYERS[i].Name, Cells: ['', '', '', '', '', '', '', '', ''], IsFirstMove: true };
                    nextId++;
                    GAMES.push(newgame);
                    sendData(JSON.stringify({ HostGame: hostKey, Action: "newjoin", User: player, Id: newgame.Id, UserTarget: PLAYERS[i].Name, PlayerTurn: newgame.PlayerTurn, Player1: newgame.Player1, Player2: newgame.Player2, Cells: ['', '', '', '', '', '', '', '', ''] }));
                    sendData(JSON.stringify({ HostGame: hostKey, Action: "newjoin", User: player, Id: newgame.Id, UserTarget: outerPlayer, PlayerTurn: newgame.PlayerTurn, Player1: newgame.Player1, Player2: newgame.Player2, Cells: ['', '', '', '', '', '', '', '', ''] }));
                }
            }
            bindRanking();
        }
        let newUser = { Name: outerPlayer, NumberOfVictories: 0, NumberOfDefeats: 0 };
        PLAYERS.push(newUser);

    }
}

function newJoin(obj) {
    if (player != undefined && player != '') {
        let game = { Player1: obj.Player1, Player2: obj.Player2, Player1Key: X_CLASS, Player2Key: CIRCLE_CLASS, Id: obj.Id, PlayerTurn: obj.PlayerTurn, Cells: ['', '', '', '', '', '', '', '', ''], IsFirstMove: true };
        GAMES.push(game);
        buildBord(obj.Id, obj.Player1, obj.Player2);
        let currentKey = (game.Player1 == player ? game.Player1Key : game.Player2Key);
        setBoardHoverClass(obj.Id, currentKey);
    }
}

function ReconectJoin() {
    if (player != undefined && player != '') {
        let game = { Player1: obj.Player1, Player2: obj.Player2, Player1Key: X_CLASS, Player2Key: CIRCLE_CLASS, Id: obj.Id, PlayerTurn: obj.PlayerTurn, Cells: obj.Cells, IsFirstMove: false, Cells: ['', '', '', '', '', '', '', '', ''] };
        GAMES.push(game);
        buildBord(obj.Id, obj.Player1, obj.Player2);
        let currentKey = (game.Player1 == player ? game.Player1Key : game.Player2Key);
        setBoardHoverClass(obj.Id, currentKey);
        bindCells(game.Id, game.Cells);
    }
}


function addMove(id, idCell, outerPlayer) {

    let game = getGameById(id);

    if (game == null || game.Cells[idCell] != '') {
        console.log("movimento errado");
        return;
    }

    let playerTurn = game.Player1;
    let currentKey = game.Player2Key;
    let currentWinner = game.Player2;
    if (game.Player1 == outerPlayer) {
        playerTurn = game.Player2;
        currentKey = game.Player1Key;
        currentWinner = game.Player1;
    }

    let cell = document.getElementById("bord" + id + "cell" + idCell);

    placeMark(cell, currentKey);
    game.Cells[idCell] = currentKey;

    if (checkWin(currentKey, id)) {
        endGame(false, id, currentWinner);
        return;
    }
    else if (isDraw(id)) {
        endGame(true, id, "");
        return;
    }
    else {
        let winningMessage = document.getElementById('WinningMessage' + id);
        winningMessage.innerText = `Vez do ${playerTurn}`;
    }
    unBlock(id);
}

function handleClick(e) {

    if (e === undefined) {
        console.log("handleClick movimento errado nulo");
        return;
    }

    const cell = e.target;

    let hostgameid = cell.getAttribute("hostgameid");
    console.log("handleClick-hostgameid", hostgameid);

    let game = getGameById(hostgameid);
    let idCell = cell.getAttribute("data-cell");
    console.log("handleClick-idCell", idCell);

    if (game == null || game.Cells[idCell] != '') {
        console.log("handleClick movimento errado Cells", game);
        return;
    }

    let playerTurn = game.Player1;
    let currentKey = game.Player2Key;
    let currentWinner = game.Player2;
    if (game.Player1 == player) {
        playerTurn = game.Player2;
        currentKey = game.Player1Key;
        currentWinner = game.Player1;
    }

    game.Cells[idCell] = currentKey;

    placeMark(cell, currentKey);

    if (checkWin(currentKey, hostgameid)) {
        endGame(false, hostgameid, currentWinner);
        return;
    }
    else if (isDraw(hostgameid)) {
        endGame(true, hostgameid, "");
        return;
    }
    else {
        let winningMessage = document.getElementById('WinningMessage' + hostgameid);
        winningMessage.innerText = `Vez do ${playerTurn}`;
        game.PlayerTurn = playerTurn;
    }

    block(hostgameid);
    let action = (IsHostGame == true && game.IsFirstMove ? "loadjoin" : "move");
    sendData(JSON.stringify({ HostGame: hostKey, Action: action, User: player, Id: hostgameid, IdCell: idCell, Cells: game.Cells, UserTarget: playerTurn }));
    game.IsFirstMove = false;
}

function endGame(draw, id, winner) {
    let winningMessage = document.getElementById('WinningMessage' + id);
    let btn = document.getElementById("btnResetHost" + id)
    if (draw) {
        winningMessage.innerText = 'Empate!';
        btn.style.visibility = "visible";
    } else {
        winningMessage.innerText = `${winner} ganhou!`;
        btn.style.visibility = "visible";
    }

    let game = getGameById(id);

    game.LastWinner = winner;

    if (game.Player1 == winner) {
        if (game.ScoreX == null) game.ScoreX = 0;
        game.ScoreX++;
        let span = document.getElementById("bord" + id + "ScoreX")
        span.textContent = game.ScoreX;
    }
    else if (game.Player2 == winner) {
        if (game.ScoreO == null) game.ScoreO = 0;
        game.ScoreO++;
        let span = document.getElementById("bord" + id + "ScoreO")
        span.textContent = game.ScoreO;
    }

    if (IsHostGame == true) {

        if (game.Player1 == winner) {
            let pl = getPlayerBYName(game.Player1);
            if (pl != null) pl.NumberOfVictories++;

            let p2 = getPlayerBYName(game.Player2);
            if (p2 != null) p2.NumberOfDefeats++;
        }
        else if (game.player2 == winner) {
            let pl = getPlayerBYName(game.Player1);
            if (pl != null) pl.NumberOfDefeats++;

            let p2 = getPlayerBYName(game.Player2);
            if (p2 != null) p2.NumberOfVictories++;
        }

        if (PLAYERS.length >= 3) {
            bindRanking();
            for (let i = 0; i < PLAYERS.length; i++) {
                if (PLAYERS[i].Name != player) {
                    sendData(JSON.stringify({ HostGame: hostKey, Action: "ranking", User: player, UserTarget: PLAYERS[i].Name, Players: PLAYERS }));
                }
            }
        }
    }

    let usertarget = game.Player2 == player ? game.Player1 : game.Player2;
    sendData(JSON.stringify({ HostGame: hostKey, Action: "endgame", User: player, Id: id, Cells: game.Cells, Winner: winner, UserTarget: usertarget, Draw: draw }));
}

function isDraw(id) {
    const element = document.getElementById("bord" + id);
    let cellElements = element.querySelectorAll('[hostgameid]');
    return [...cellElements].every(cell => { return cell.classList.contains(X_CLASS) || cell.classList.contains(CIRCLE_CLASS) });
}

function placeMark(cell, currentClass) {
    cell.classList.add(currentClass)
}

function bindCells(id, cells) {
    const element = document.getElementById("bord" + id);
    let cellElements = element.querySelectorAll('[hostgameid]');
    let i = 0
    cellElements.forEach(cell => {
        if (cells[i] != '')
            cell.classList.add(cells[i])
        i++
    })
}


function block(id) {
    const element = document.getElementById("bord" + id);
    let cellElements = element.querySelectorAll('[hostgameid]');
    cellElements.forEach(cell => {
        cell.removeEventListener('click', handleClick);
    })
}

function unBlock(id) {
    const element = document.getElementById("bord" + id);
    let cellElements = element.querySelectorAll('[hostgameid]');
    cellElements.forEach(cell => {
        cell.addEventListener('click', handleClick, { once: true });
    })
}

function clear(e) {
    let id = e.target.data;
    let usertarget = reset(id);
    e.target.style.visibility = "hidden";
    sendData(JSON.stringify({ HostGame: hostKey, Action: "reset", User: player, Id: id, UserTarget: usertarget }));
    console.log("clear", usertarget, id);
}

function reset(id) {
    const element = document.getElementById("bord" + id);
    let cellElements = element.querySelectorAll('[hostgameid]');
    let game = getGameById(id);

    cellElements.forEach(cell => {
        cell.classList.remove(X_CLASS);
        cell.classList.remove(CIRCLE_CLASS);
        cell.removeEventListener('click', handleClick);
        cell.addEventListener('click', handleClick, { once: true });
    })

    let winningMessage = document.getElementById('WinningMessage' + id);
    game.Cells = ['', '', '', '', '', '', '', '', ''];


    winningMessage.innerText = `Vez do ${game.LastWinner}`;
    game.PlayerTurn = game.LastWinner;

    return game.Player2 == player ? game.Player1 : game.Player2;
}

function setBoardHoverClass(id, playerClass) {
    let board = document.getElementById("bord" + id);
    if (board) {
        board.classList.remove(X_CLASS);
        board.classList.remove(CIRCLE_CLASS);
        board.classList.add(playerClass);
    }
}

function checkWin(currentClass, id) {
    const element = document.getElementById("bord" + id);
    let cellElements = element.querySelectorAll('[hostgameid]');
    return WINNING_COMBINATIONS.some(combination => {
        return combination.every(index => {
            return cellElements[index].classList.contains(currentClass);
        });
    });
}

function showInfoHost() {

    let gameInfo = document.getElementById('gameInfo');
    gameInfo.textContent = "Aguarde seu adversário";

    let btnaddUser = document.getElementById('addUser');
    btnaddUser.classList.add("d-none");

    let btnjoinUser = document.getElementById('joinUser');
    btnjoinUser.classList.add("d-none");

    let btncopyKey = document.getElementById('copyKey');
    btncopyKey.classList.remove("d-none");
    btncopyKey.classList.add("d-block");

    let txthostkey = document.getElementById('hostkey');
    txthostkey.setAttribute('disabled', '');
    txthostkey.value = hostKey;

    let txtusername = document.getElementById('username');
    txtusername.setAttribute('disabled', '');

    let txtApiKey = document.getElementById('dvApiKey');
    txtApiKey.classList.add("d-none");
}

function buildBord(id, player1, player2) {

    let divCol = document.createElement("div");
    divCol.setAttribute("id", "host" + id);
    divCol.setAttribute("class", "col");

    let divCard = document.createElement("div");
    divCard.setAttribute("class", "card border-secondary mb-3");

    let divCardHeader = document.createElement("div");
    divCardHeader.setAttribute("class", "card-header");

    let rowKeys = document.createElement("div");
    rowKeys.setAttribute("class", "row");
    let colKeysX = document.createElement("div");
    colKeysX.setAttribute("class", "col");
    let h1KeysX = document.createElement("h1");
    h1KeysX.textContent = "X";
    colKeysX.appendChild(h1KeysX);
    rowKeys.appendChild(colKeysX);
    let colKeysO = document.createElement("div");
    colKeysO.setAttribute("class", "col");
    let h1KeysO = document.createElement("h1");
    h1KeysO.textContent = "O";
    colKeysO.appendChild(h1KeysO);
    rowKeys.appendChild(colKeysO);


    let rowPLAYERS = document.createElement("div");
    rowPLAYERS.setAttribute("class", "row");
    let colPLAYERSX = document.createElement("div");
    colPLAYERSX.setAttribute("class", "col");
    let h1PlayerX = document.createElement("h1");
    h1PlayerX.textContent = player1;
    colPLAYERSX.appendChild(h1PlayerX);
    rowPLAYERS.appendChild(colPLAYERSX);
    let colPLAYERSO = document.createElement("div");
    colPLAYERSO.setAttribute("class", "col");
    let h1PalyersO = document.createElement("h1");
    h1PalyersO.textContent = player2;
    colPLAYERSO.appendChild(h1PalyersO);
    rowPLAYERS.appendChild(colPLAYERSO);


    let rowScore = document.createElement("div");
    rowScore.setAttribute("class", "row");
    let colScoreX = document.createElement("div");
    colScoreX.setAttribute("class", "col");
    let spanScoreX = document.createElement("span");
    spanScoreX.setAttribute("class", "badge text-bg-warning rounded-pill");
    spanScoreX.setAttribute("id", "bord" + id + "ScoreX");
    spanScoreX.textContent = "0";
    colScoreX.appendChild(spanScoreX);
    rowScore.appendChild(colScoreX);
    let colScoreO = document.createElement("div");
    colScoreO.setAttribute("class", "col");
    let spanScoreO = document.createElement("span");
    spanScoreO.setAttribute("class", "badge text-bg-warning rounded-pill");
    spanScoreO.setAttribute("id", "bord" + id + "ScoreO");
    spanScoreO.textContent = "0";
    colScoreO.appendChild(spanScoreO);
    rowScore.appendChild(colScoreO);


    divCardHeader.appendChild(rowKeys);
    divCardHeader.appendChild(rowPLAYERS);
    divCardHeader.appendChild(rowScore);
    divCard.appendChild(divCardHeader);

    let divCardbody = document.createElement("div");
    divCardbody.setAttribute("class", "card-body text-secondary");

    let divBord = document.createElement("div");
    divBord.setAttribute("id", "bord" + id);
    divBord.setAttribute("class", "board");

    for (let i = 0; i < 9; i++) {
        let nodeCell = document.createElement("div");
        nodeCell.setAttribute("id", "bord" + id + "cell" + i);
        nodeCell.setAttribute("class", "cell");
        nodeCell.setAttribute("data-cell", i);
        nodeCell.setAttribute("hostgameid", id);
        nodeCell.addEventListener('click', handleClick, { once: true })
        divBord.appendChild(nodeCell);
    }

    divCardbody.appendChild(divBord);
    divCard.appendChild(divCardbody);

    let divCardFooter = document.createElement("div");
    divCardFooter.setAttribute("class", "card-footer text-body-secondary");

    let h3WinningMessage = document.createElement("h3");
    h3WinningMessage.setAttribute("id", "WinningMessage" + id);
    h3WinningMessage.textContent = "Sua vez";
    divCardFooter.appendChild(h3WinningMessage);

    let btnReset = document.createElement("button");
    btnReset.setAttribute("id", "btnResetHost" + id);
    btnReset.data = id;
    btnReset.setAttribute("data", id);
    btnReset.innerHTML = 'Jogar Novamente';
    btnReset.style.visibility = "hidden";
    btnReset.onclick = clear;
    divCardFooter.appendChild(btnReset);
    divCard.appendChild(divCardFooter);

    divCol.appendChild(divCard);
    let mainGame = document.getElementById('mainGame')
    mainGame.appendChild(divCol);

    //let userDiv = document.getElementById('headeruser');
    //userDiv.innerHTML = "<h1>Jogador:" + player + " Servidor:" + hostKey + "</h1>";

}

function copyKey() {
    var copyText = document.getElementById("hostkey");

    // Select the text field
    copyText.select();
    copyText.setSelectionRange(0, 99999); // For mobile devices

    // Copy the text inside the text field
    navigator.clipboard.writeText(copyText.value);

    var tooltip = document.getElementById("copyinfo");
    tooltip.innerHTML = "Copiado: " + copyText.value;

    var divtoast = document.getElementById("copytoast");
    var toast = new bootstrap.Toast(divtoast)
    toast.show();
}

function reconect() {
    startSendData(JSON.stringify({ HostGame: hostKey, Action: "reconect", User: player }));
}

function compare(a, b) {
    let nA = Number(a.NumberOfVictories);
    let nB = Number(b.NumberOfVictories);
    if (nA > nB) {
        return -1;
    }
    if (nA < nB) {
        return 1;
    }
    return 0;
}

function bindRanking() {

    let rankinglist = document.getElementById('rankinglist')
    rankinglist.innerHTML = "";
    //{ Name: outerPlayer, NumberOfVictories: 0, NumberOfDefeats: 0 };
    PLAYERS = PLAYERS.sort(compare);

    for (var i = 0; i < PLAYERS.length; i++) {

        let li = document.createElement("li");
        li.setAttribute("class", "list-group-item d-flex justify-content-between align-items-center");
        li.textContent = PLAYERS[i].Name;

        let spanv = document.createElement("span");
        spanv.setAttribute("class", "badge bg-success rounded-pill");
        spanv.setAttribute("data-bs-toggle", "tooltip");
        spanv.setAttribute("data-bs-placement", "top");
        spanv.setAttribute("data-bs-title", "Vitórias");
        spanv.textContent = PLAYERS[i].NumberOfVictories;
        li.appendChild(spanv);

        let spand = document.createElement("span");
        spand.setAttribute("class", "badge bg-danger rounded-pill");
        spand.setAttribute("data-bs-toggle", "tooltip");
        spand.setAttribute("data-bs-placement", "top");
        spand.setAttribute("data-bs-title", "Derrotas");
        spand.textContent = PLAYERS[i].NumberOfDefeats;
        li.appendChild(spand);

        rankinglist.appendChild(li);
    }

    let ranking = document.getElementById('rankingplayers');
    ranking.classList.remove("d-none");
    //ranking.classList.add("d-block");

    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))

}

function clearClient() {
    GAMES = [];
    PLAYERS = [];

    var tooltip = document.getElementById("copyinfo");
    tooltip.innerHTML = "O servidor foi reconectado aguarde a sincronização de dados";

    var divtoast = document.getElementById("copytoast");
    var toast = new bootstrap.Toast(divtoast)
    toast.show();


    let mainGame = document.getElementById('mainGame');
    mainGame.innerHTML = "";

}


function changeGame(obj) {

    let game = getGameById(obj.Id);
    console.log("changeGame", obj);
    if (game == null) return;

    if (game.Player1 == player || game.Player2 == player) {

        const element = document.getElementById("bord" + obj.Id);
        let cellElements = element.querySelectorAll('[hostgameid]');
        let i = 0
        cellElements.forEach(cell => {
            if (obj.Cells[i] != '')
                cell.classList.add(obj.Cells[i]);
            i++;
            cell.removeEventListener('click', handleClick);
        })

        let winningMessage = document.getElementById('WinningMessage' + obj.Id);
        let btn = document.getElementById("btnResetHost" + obj.Id)
        if (obj.Draw == true) {
            winningMessage.innerText = 'Empate!';
            btn.style.visibility = "visible";
        } else {
            winningMessage.innerText = `${obj.Winner} ganhou!`;
            btn.style.visibility = "visible";
        }
    } else {
        game.Cells = obj.Cells;
    }

    game.PlayerTurn = obj.Winner
    game.LastWinner = obj.Winner;

    if (IsHostGame == true) {
        if (game.Player1 == obj.Winner) {
            let pl = getPlayerBYName(game.Player1);
            if (pl != null) pl.NumberOfVictories++;

            let p2 = getPlayerBYName(game.Player2);
            if (p2 != null) p2.NumberOfDefeats++;
        }
        else if (game.player2 == obj.Winner) {
            let pl = getPlayerBYName(game.Player1);
            if (pl != null) pl.NumberOfDefeats++;

            let p2 = getPlayerBYName(game.Player2);
            if (p2 != null) p2.NumberOfVictories++;
        }

        if (PLAYERS.length >= 3) {
            bindRanking();
            for (let i = 0; i < PLAYERS.length; i++) {
                if (PLAYERS[i].Name != player) {
                    sendData(JSON.stringify({ HostGame: hostKey, Ation: "ranking", User: player, UserTarget: PLAYERS[i].Name, Players: PLAYERS }));
                }
            }
        }
    }
}