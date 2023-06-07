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
const port = 80;
/////////////////// SETUP ///////////////////


/////////////////// LIBS ///////////////////
let wave_data = JSON.parse(fs.readFileSync(__dirname + '/server/waves.json'));
// load exports.Bloon from server/classes.js
const classes = require(__dirname + '/assets/js/classes.js');
const Bloon = classes.Bloon;
const Tower = classes.Tower;
const Projectile = classes.Projectile;

// load exports.maps and exports.distToSegment from server/maps.js
const mapsfile = require(__dirname + '/assets/js/maps.js');
const maps = mapsfile.maps;
const distToSegment = mapsfile.distToSegment;
/////////////////// LIBS ///////////////////


/////////////////// LOGGER ///////////////////
function BetterLog(type, str) {
    console.log("\x1b[90m[" + new Date().toLocaleString() + "] " + colors[type] + str + "\x1b[0m");
}
/////////////////// LOGGER ///////////////////


/////////////////// WEBSOCKET ///////////////////
function SendPacketToPlayers(game, msg)
{
    for (const [key, value] of Object.entries(open_websockets))
        for (var i = 0; i < game.players.length; i++)
            if (game.players[i].uid == value.uid)
                value.send(msg);
}




app.ws('/', function (ws, req) {
    BetterLog("success", "Websocket Connection Received from " + req.connection.remoteAddress.replace("::ffff:", ""));
    if (ws.uid == undefined)
    {
        ws.uid = Math.floor(Math.random() * 8999 + 1000);
        BetterLog("success", "Assigned UID " + ws.uid + " to " + req.connection.remoteAddress.replace("::ffff:", ""));
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
                            uid: ws.uid
                        }
                    ],
                    timestamp: Math.floor(Date.now() / 1000),
                }

                // roll random map
                let map_keys = Object.keys(maps);
                games[game_id].map = map_keys[Math.floor(Math.random() * map_keys.length)];

                BetterLog("success", "New game started on game_id '" + game_id + "' on map '" + games[game_id].map + "' by player '" + username + "'");
                ws.send("game_created|" + game_id);
            }
            else {
                // if game_id exists, check if game has 2 players, if not add player
                if (games[game_id].players.length < 2) {
                    games[game_id].players.push({
                        ip: ip,
                        username: username,
                        uid: ws.uid
                    });
                    BetterLog("success", "Player '" + username + "' joined game_id '" + game_id + "'");
                    ws.send("game_created|" + game_id);

                    // send joined message to other player
                    for (const [key, value] of Object.entries(open_websockets)) {
                        if (value.uid == games[game_id].players[0].uid)
                        {
                            value.send("player_joined|" + username); // send to other player
                            ws.send("player_joined|" + games[game_id].players[0].username); // send

                            setTimeout(GameLoop, 1000, game_id, true);
                        }
                    }
                }
                else {
                    BetterLog("error", "Game '" + game_id + "' is full");
                    ws.send("game_full");
                }
            }
        }


        if (msg.startsWith('get_data|')) {
            const game_id = msg.split('|')[1].toLowerCase();
            if (games[game_id] != undefined)
            {
                games[game_id].timestamp = timestamp;
            	ws.send("game_data|" + JSON.stringify(games[game_id]));
            }

            return;
        }


        // update_data|sell_tower|58
        if (msg.startsWith('update_data|')) {
            let action = msg.split('|')[1].toLowerCase();

            // get game from uid
            let game_id = "";
            let player_index = -1;
            let player_name = "";
            for (const [key, value] of Object.entries(games)) {
                try {
                    for (var i = 0; i < value.players.length; i++) {
                        if (value.players[i].uid == ws.uid)
                        {
                            game_id = key;
                            player_index = i;
                            player_name = value.players[i].username;
                        }
                    }
                }
                catch (e) { }
            }

            if (game_id == "")
            {
                BetterLog("error", "Player " + player_name + " tried to update data but is not in a game");
                return;
            }

            switch (action) {
                case "place_tower":
                    let type = msg.split('|')[2].toLowerCase();

                    let tower = new Tower();
                    tower.x = parseInt(msg.split('|')[3].toLowerCase());
                    tower.y = parseInt(msg.split('|')[4].toLowerCase());
                    tower.DefineTower(type);

                    if (games[game_id].money < tower.price)
                    {
                        BetterLog("error", "Player " + player_name + " tried to place a tower but does not have enough money");
                        return;
                    }

                    // if towers is null, set to empty array
                    if (games[game_id].towers == null)
                        games[game_id].towers = [];

                    // play place tower sound
                    SendPacketToPlayers(games[game_id], "play_sound|18_PlaceTower");

                    games[game_id].money -= tower.price; // remove money from player
                    games[game_id].towers.push(tower); // add tower to game
                    BetterLog("normal", "Player " + player_name + " placed a tower on game " + game_id + " | Money: " + games[game_id].money);
                    break;

                case "sell_tower":
                    let x = parseInt(msg.split('|')[2].toLowerCase());
                    let y = parseInt(msg.split('|')[3].toLowerCase());

                    // if towers is null, set to empty array
                    if (games[game_id].towers == null)
                        games[game_id].towers = [];

                    for (var i = 0; i < games[game_id].towers.length; i++)
                    {
                        if (games[game_id].towers[i].x == x && games[game_id].towers[i].y == y)
                        {
                            SendPacketToPlayers(games[game_id], "play_sound|62_Sell");
                            BetterLog("normal", "Player " + player_name + " sold a tower for " + games[game_id].towers[i].sell_value + " money");
                            games[game_id].money += games[game_id].towers[i].sell_value;
                            games[game_id].towers.splice(i, 1);
                            break;
                        }
                    }

                    break;

                case "upgrade_tower":
                    /* TODO: */
                    break;

                case "start_round":
                    // check if all bloons are popped
                    let all_bloons_popped = true;
                    // if bloons is null, set to empty array
                    if (games[game_id].wave.bloons == null)
                        games[game_id].wave.bloons = [];

                    for (const [key, value] of Object.entries(games[game_id].wave.bloons)) {
                        if (!value.popped)
                        {
                            all_bloons_popped = false;
                            break;
                        }
                    }

                    if (all_bloons_popped)
                    {
                        games[game_id].wave.round++;
                        games[game_id].wave.started = true;
                        games[game_id].wave.running = true;
                        BetterLog("normal", "Player " + player_name + " started round " + games[game_id].wave.round + " on game " + game_id);
                    }
                    else
                        BetterLog("error", "Player " + player_name + " tried to start round " + games[game_id].wave.round + " on game " + game_id + " but not all bloons are popped");

                    break;
            }
        }
    });

    ws.on('close', function () {
        BetterLog("warning", "Websocket Connection Closed from: " + req.connection.remoteAddress.replace("::ffff:", ""));

        // find game_id and remove player
        for (const [key, value] of Object.entries(games)) {
            try {
                for (var i = 0; i < value.players.length; i++) {
                    if (value.players[i].uid == ws.uid)
                    {
                        let game_id = key;
                        BetterLog("warning", "Removed player from game_id '" + key + "' due to websocket close");
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
                            BetterLog("warning", "Removed game_id '" + game_id + "' due to inactivity");
                        }
                    }
                }
            }
            catch (e) { }
        }

        // remove websocket from open_websockets
        delete open_websockets[ws.uid]
    });

    ws.on('error', function (err) {
        BetterLog("error", "Websocket Connection Error from: " + req.connection.remoteAddress.replace("::ffff:", ""));
    });
});
/////////////////// WEBSOCKET ///////////////////



/////////////////// LOAD MAIN PAGE ///////////////////
app.get('/', function (req, res, next) {
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

    res.send(html);
    BetterLog("success", req.connection.remoteAddress.replace("::ffff:", "") + " opened the page");
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
        BetterLog("normal", "There is currently " + Object.keys(games).length + " active games");
        for (const [key, value] of Object.entries(games)) {
            BetterLog("normal", "Game " + key + " has " + value.players.length + " players");
        }
    }
    else
        BetterLog("normal", "There is currently " + Object.keys(games).length + " active games");
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
        BetterLog("error", "Exiting...");
        process.exit();
    }
});
/////////////////// KEY HANDLERS ///////////////////



/////////////////// START SERVER ///////////////////
app.listen(port, function () {
    BetterLog("success", "Started server on port " + port);
});

if (is_pm2)
{
    BetterLog("warning", "Detected PM2, keypress handlers will not work");
    setInterval(function () { LogStatus(true); }, 10000);
}

setInterval(function () {
    timestamp = Math.floor(Date.now() / 10);
}, 10);
/////////////////// START SERVER ///////////////////


/////////////////// START GAME LOOP ///////////////////
let last_tick = 0;
function GameLoop(game_id, first_run = false)
{
    let game = games[game_id];
    if (game != null)
    {
        if (first_run)
        {
            game.wave_data = JSON.parse(JSON.stringify(wave_data));
            game.wave = {
                started: true,
                running: true,
                round: 0,
                bloons: []
            }
            game.health = 100;
            game.money = 650;
            game.towers = [];
            games[game_id] = game; // save game
        }

        if (game.wave_data != null)
        {
            if (game.wave.started)
            {
                game.wave.started = false;
                game.wave.bloons = [];
                game.wave.last_spawn = timestamp;
                game.wave.spawn_interval = 0;
                game.wave.total_bloons = 0;
            
                // get total bloons
                if (game.wave.round > 0)
                {
                    // check if round exists
                    let round_exists = false;
                    if (game.wave_data[game.wave.round] != undefined)
                    {
                        for (const [key, value] of Object.entries(game.wave_data[game.wave.round])) {
                            if (key == "interval")
                            {
                                game.wave.spawn_interval = value;
                                continue;
                            }
        
                            // check if value is a numebr
                            if (isNaN(value))
                                continue;

                            game.wave.total_bloons += parseInt(value);
                            round_exists = true;
                        }
                    }

                    if (!round_exists)
                    {
                        SendPacketToPlayers(game, "game_over_win");
                        SendPacketToPlayers(game, "play_sound|61_GameWin");
                        BetterLog("success", "Game " + game_id + " has ended");
                        delete games[game_id];
                        return;
                    }

                    // send round_started to players
                    SendPacketToPlayers(game, "round_started|" + game.wave.round);
                   
                    BetterLog("warning", "Starting round " + game.wave.round + " on game " + game_id + " | Total Bloons: " + game.wave.total_bloons);
                }
            
                games[game_id] = game; // save game
            }

            // spawn bloons
            if (game.wave.bloons.length < game.wave.total_bloons)
            {
                // get time since last spawn
                let time_since_last_spawn = timestamp - game.wave.last_spawn;
            
                // if time since last spawn is greater than spawn interval
                if (time_since_last_spawn >= game.wave.spawn_interval)
                {
                    game.wave.last_spawn = timestamp;
                    // get bloon to spawn
                    let bloon_to_spawn = null;
                    for (const [key, value] of Object.entries(game.wave_data[game.wave.round])) {
                        // skip interval
                        if (key == "interval")
                            continue;

                        if (value > 0)
                        {
                            bloon_to_spawn = key;
                            break;
                        }
                    }

                    // if bloon to spawn is not null, spawn it
                    if (bloon_to_spawn != null)
                    {
                        game.wave.bloons.push(new Bloon(bloon_to_spawn));
                        game.wave_data[game.wave.round][bloon_to_spawn]--;
                    }
                }
                games[game_id] = game; // save game
            }
        
        
        
            // move bloons
            if (timestamp != last_tick) {
                for (const [key, value] of Object.entries(game.wave.bloons)) {
                    value.progress += value.speed;
                
                    // if bloon is at the end
                    if (value.progress >= 1 && !value.popped)
                    {
                        game.wave.bloons[key].popped = true;
                        game.health -= value.health;
                        BetterLog("error", "Bloon reached the end on game " + game_id + " | Health: " + game.health);

                        // if last bloon, end round
                        let all_bloons_popped = true;
                        for (const [key3, value3] of Object.entries(game.wave.bloons)) {
                            if (!value3.popped)
                            {
                                all_bloons_popped = false;
                                break;
                            }
                        }

                        if (all_bloons_popped)
                            SendPacketToPlayers(game, "round_over");

                    }
                    games[game_id] = game; // save game
                }
            }
        
            // is player dead?
            if (game.health <= 0)
            {
                game.wave = null;
                game.health = 0;
                game.money = 0;
                game.wave = null;
                BetterLog("error", "Game id " + game_id + " has ended");
                games[game_id] = game; // save game

                // send game over to players
                SendPacketToPlayers(game, "game_over");
                SendPacketToPlayers(game, "play_sound|63_GameOver");
            }

            // loop all towers to check which bloon has the highest progress value and is in range
            for (const [key, value] of Object.entries(game.towers)) {
                // get furthest bloon
                let furthest_bloon = null;
                let furthest_bloon_position = null;
                for (const [key2, value2] of Object.entries(game.wave.bloons)) {
                    if (!value2.popped)
                    {
                        let bloon_position = value2.GetPosition(mapsfile.maps[game.map]);
                        let distance = Math.sqrt(Math.pow(value.x - bloon_position[0], 2) + Math.pow(value.y - bloon_position[1], 2));
                        if (distance <= (value.range / 2))
                        {
                            if (furthest_bloon == null)
                            {
                                furthest_bloon = value2;
                                furthest_bloon_position = bloon_position;
                            }
                            else if (furthest_bloon.progress < value2.progress)
                            {
                                furthest_bloon = value2;
                                furthest_bloon_position = bloon_position;
                            }
                        }
                    }
                }

                // if furthest bloon is not null, attack it
                if (furthest_bloon != null)
                {
                    let projectile = value.Attack(furthest_bloon_position[0], furthest_bloon_position[1]);
                    if (projectile != null)
                        game.projectiles.push(projectile);

                    games[game_id] = game;
                }
            }

            // loop all projectiles
            if (timestamp != last_tick) {
                if (game.projectiles == null)
                    game.projectiles = [];

                for (const [key, value] of Object.entries(game.projectiles)) {
                    let old_pos = [value.x, value.y];
                    value.Move();

                    // check if projectile is out of bounds
                    if (value.x > 1642 || value.x < 24 || value.y > 951 || value.y < 50)
                    {
                        delete game.projectiles[key];
                        games[game_id] = game; // save game
                        continue;
                    }

                    // check if projectile is in range of bloon
                    for (const [key2, value2] of Object.entries(game.wave.bloons)) {
                        if (!value2.popped)
                        {
                            let bloon_position = value2.GetPosition(mapsfile.maps[game.map]);
                            let distance = Math.sqrt(Math.pow(value.x - bloon_position[0], 2) + Math.pow(value.y - bloon_position[1], 2));
                            if (distance <= 10 || distToSegment(value.x, value.y, old_pos[0], old_pos[1], bloon_position[0], bloon_position[1]) <= 10)
                            {
                                // play random pop sound
                                let pop = Math.floor(Math.random() * 4 + 1);
                                let pop_sound = (27 + pop) + "_Pop" + pop;
                                SendPacketToPlayers(game, "play_sound|" + pop_sound);

                                // add money to player
                                game.money += value2.health;

                                // remove damage from bloon
                                game.wave.bloons[key2].health -= value.damage;
                                if (game.wave.bloons[key2].health <= 0)
                                    game.wave.bloons[key2].popped = true;

                                // loop all bloons to check if they are popped
                                let all_bloons_popped = true;
                                for (const [key3, value3] of Object.entries(game.wave.bloons)) {
                                    if (!value3.popped)
                                    {
                                        all_bloons_popped = false;
                                        break;
                                    }
                                }
                            
                                if (all_bloons_popped && game.wave.running)
                                {
                                    game.money += 100 + game.wave.round;
                                    BetterLog("success", "All bloons popped on game " + game_id + " | Money: " + game.money);

                                    // send round_over to players
                                    SendPacketToPlayers(game, "round_over");
                                    game.wave.running = false;
                                }

                                // damage projectile and remove if health is 0 or less
                                game.projectiles[key].health--;
                                if (game.projectiles[key].health <= 0)
                                {
                                    // remove projectile from projectiles
                                    delete game.projectiles[key];
                                    games[game_id] = game; // save game
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    games[game_id] = game; // save game
    last_tick = timestamp;
    
    setTimeout(GameLoop, 0, game_id);
}