/////////////////// SETUP ///////////////////
const { time } = require('console');
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const expressWs = require('express-ws')(app);
__dirname = path.join(__dirname, '..');
app.use(express.static(__dirname + '/public'));
let is_pm2 = false;
let games = {}
let open_websockets = {}
let timestamp = Math.floor(Date.now() / 10);
const colors = {
    normal: "\x1b[37m",
    warning: "\x1b[33m",
    error: "\x1b[31m",
    success: "\x1b[32m"
};
const port = 3500;
/////////////////// SETUP ///////////////////


/////////////////// LIBS ///////////////////
let classes_js = fs.readFileSync(path.join(__dirname, 'assets', 'js', 'classes.js'), 'utf8');
eval(classes_js);
/////////////////// LIBS ///////////////////


/////////////////// FUNCTIONS ///////////////////
function BettterLog(type, str) {
    console.log("\x1b[90m[" + new Date().toLocaleString() + "] " + colors[type] + str + "\x1b[0m");
}

function base64Decode(str) {
    return Buffer.from(str, 'base64').toString('utf8')  
}
/////////////////// FUNCTIONS ///////////////////



/////////////////// WEBSOCKET ///////////////////
app.ws('/', function (ws, req) {
    BettterLog("success", "Websocket Connection Received from " + req.connection.remoteAddress.replace("::ffff:", ""));
    if (ws.uid == undefined)
    {
        ws.uid = Math.floor(Math.random() * 8999 + 1000);
        BettterLog("success", "Assigned UID " + ws.uid + " to " + req.connection.remoteAddress.replace("::ffff:", ""));
    }

    // add websocket to open_websockets
    open_websockets[ws.uid] = ws;

    ws.on('message', function (msg) {
        if (msg == 'ping') {
            ws.send("pong");
            return;
        }

        if (msg.startsWith('join|')) {
            const game_id = msg.split('|')[1].toLowerCase();
            const username = msg.split('|')[2].toLowerCase();
            const ip = req.connection.remoteAddress.replace("::ffff:", "");

            if (games[game_id] == undefined) {
                
                games[game_id] = {
                    players : [
                        {
                            ip: ip,
                            username: username,
                            score: 0,
                            uid: ws.uid
                        }
                    ],
                    timestamp: Math.floor(Date.now() / 1000),
                }
                BettterLog("success", "Created new game_id '" + game_id + "' from IP: " + ip);
                ws.send("game_created|" + game_id);
            }
            else {
                // if game_id exists, check if game has 2 players, if not add player
                if (games[game_id].players.length < 2) {
                    games[game_id].players.push({
                        ip: ip,
                        username: username,
                        score: 0,
                        uid: ws.uid
                    });
                    BettterLog("success", "Added player to game_id '" + game_id + "' from IP: " + ip);
                    ws.send("game_created|" + game_id);

                    // send joined message to other player
                    for (const [key, value] of Object.entries(open_websockets)) {
                        if (value.uid == games[game_id].players[0].uid)
                        {
                            value.send("player_joined|" + username); // send to other player
                            ws.send("player_joined|" + games[game_id].players[0].username); // send 
                        }
                    }
                }
                else {
                    BettterLog("error", "Game '" + game_id + "' is full");
                    ws.send("game_full");
                }
            }
        }


        if (msg.startsWith('get_data|')) {
            const game_id = msg.split('|')[1].toLowerCase();
            if (games[game_id] != undefined)
            {
                // HARDCODED MAP
                games[game_id].map = "monkey_meadows";

                games[game_id].timestamp = timestamp;
            	ws.send("game_data|" + JSON.stringify(games[game_id]));
            }

            return;
        }


        // update_data|sell_tower|58



        if (msg.startsWith('update_data|')) {
            let action = msg.split('|')[1].toLowerCase();
            let data = "";
            try { msg.split('|')[2].toLowerCase(); } catch (e) { } // if no data, ignore

            // get game from uid
            let game_id = "";
            let player_index = -1;
            for (const [key, value] of Object.entries(games)) {
                for (var i = 0; i < value.players.length; i++) {
                    if (value.players[i].uid == ws.uid)
                    {
                        game_id = key;
                        player_index = i;
                    }
                }
            }


            switch (action) {
                case "place_tower":
                    break;

                case "sell_tower":
                    break;

                case "upgrade_tower":
                    break;

                case "donate_money":
                    break;

                case "start_round":
                    setTimeout(GameLoop, 1000, game_id);
                    break;
            }
        }
    });

    ws.on('close', function () {
        BettterLog("warning", "Websocket Connection Closed from: " + req.connection.remoteAddress.replace("::ffff:", ""));

        // find game_id and remove player
        for (const [key, value] of Object.entries(games)) {
            for (var i = 0; i < value.players.length; i++) {
                if (value.players[i].uid == ws.uid)
                {
                    let game_id = key;
                    BettterLog("warning", "Removed player from game_id '" + key + "' due to websocket close");
                    value.players.splice(i, 1);

                    // send left message to other player
                    for (const [key, value] of Object.entries(open_websockets)) {
                        try {
                            if (value.uid == games[game_id].players[0].uid)
                            value.send("player_left"); // send to other player
                        }
                        catch (e) { }
                    }

                    // if game is empty, remove game
                    if (value.players.length == 0)
                    {
                        delete games[game_id]
                        BettterLog("warning", "Removed game_id '" + game_id + "' due to inactivity");
                    }
                }
            }
        }

        // remove websocket from open_websockets
        delete open_websockets[ws.uid]
    });

    ws.on('error', function (err) {
        BettterLog("error", "Websocket Connection Error from: " + req.connection.remoteAddress.replace("::ffff:", ""));
    });
});
/////////////////// WEBSOCKET ///////////////////



/////////////////// LOAD MAIN PAGE ///////////////////
app.get('/', function (req, res, next) {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    res.send(html);
    BettterLog("success", req.connection.remoteAddress.replace("::ffff:", "") + " opened the page");
});
/////////////////// LOAD MAIN PAGE ///////////////////



/////////////////// ALLOW USE OF ASSETS ///////////////////
app.get('/assets/*', function (req, res, next) {
    const file = req.params[0];
    res.sendFile(path.join(__dirname, 'assets', file));
});
/////////////////// ALLOW USE OF ASSETS ///////////////////


/////////////////// LOGGER ///////////////////
function LogStatus(detailed)
{
    if (detailed)
    {
        BettterLog("normal", "There is currently " + Object.keys(games).length + " active games");
        for (const [key, value] of Object.entries(games)) {
            let last_seen = Math.floor(Date.now() / 1000) - value.timestamp;

            // if last seen is over 10 seconds, print in red
            let type = "normal";
            if (last_seen > 30)
                type = "error";
            else if (last_seen > 30)
                type = "warning";

            BettterLog(type, " > [" + key + "] IP: " + value.ip + " | Last seen " + last_seen + " seconds ago");
        }
    }
    else
        BettterLog("normal", "There is currently " + Object.keys(games).length + " active games");
}
/////////////////// LOGGER ///////////////////



/////////////////// KEY HANDLERS ///////////////////
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
try { process.stdin.setRawMode(true); } catch (e) { is_pm2 = true; websocket_url = public_websocket_url; }
process.stdin.on('keypress', (str, key) => {
    // if ctrl s is pressed, print detailed status
    if (key.ctrl && key.name === 's')
        LogStatus(true);
    else if (key.name === 's')
        LogStatus(false);

    // default exit handler
    if (key.ctrl && key.name === 'c') {
        BettterLog("error", "Exiting...");
        process.exit();
    }
});
/////////////////// KEY HANDLERS ///////////////////



/////////////////// START SERVER ///////////////////
app.listen(port, function () {
    BettterLog("success", "Started server on port " + port);
});

if (is_pm2)
{
    BettterLog("warning", "Detected PM2, keypress handlers will not work");
    setInterval(function () { LogStatus(true); }, 10000);
}

setInterval(function () {
    timestamp = Math.floor(Date.now() / 10);
}, 10);
/////////////////// START SERVER ///////////////////


/////////////////// START GAME LOOP ///////////////////
function GameLoop(game_id)
{
    let game = games[game_id];
    if (game == null)
        return;

    if (game.wave == null)
    {
        game.wave = {
            started: false,
            round: 0,
            bloons: []
        }
    }

    // start round if not started
    if (game.wave.started == false)
    {
        game.wave.started = true;
        game.wave.round++;
        game.wave.bloons = [];
    }

    // spawn bloons slowly
    if (game.wave.bloons.length < game.wave.round * 10)
        setTimeout(AddBloons, 250, game_id, 1, 1);
    

    setTimeout(GameLoop, 1000, game_id);
}

function AddBloons(game_id, health, amount)
{
    let game = games[game_id];
    if (game == null)
        return;

    for (var i = 0; i < amount; i++)
    {

        // note: Bloon is undefined
        game.wave.bloons.push(new Bloon(health));
    }
}