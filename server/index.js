/////////////////// SETUP ///////////////////
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const expressWs = require('express-ws')(app);
__dirname = path.join(__dirname, '..');
app.use(express.static(__dirname + '/public'));
let is_pm2 = false;
let games = {}
const colors = {
    normal: "\x1b[37m",
    warning: "\x1b[33m",
    error: "\x1b[31m",
    success: "\x1b[32m"
};
/////////////////// SETUP ///////////////////


/////////////////// SERVER SETTINGS ///////////////////
const port = 80;
let websocket_url = "ws://localhost/"; // FOR LOCAL SERVER
let public_websocket_url = "wss://socket.odder.world/"; // FOR EU SERVER
/////////////////// SERVER SETTINGS ///////////////////



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

    ws.on('message', function (msg) {
        if (msg.startsWith('get_data|')) {
            const apikey = msg.split('|')[1].toLowerCase();
            if (games[apikey] != undefined)
            	ws.send(JSON.stringify(games[apikey]));

            return;
        }
        else
        {
            const json = base64Decode(msg)
            const json_data = JSON.parse(json)
            const apikey = json_data.apikey.toLowerCase()
            delete json_data.apikey
            json_data.ip = req.connection.remoteAddress.replace("::ffff:", "");
            games[apikey] = json_data
        }
    });

    ws.on('close', function () {
        BettterLog("error", "Websocket Connection Closed from: " + req.connection.remoteAddress.replace("::ffff:", ""));
    });
});
/////////////////// WEBSOCKET ///////////////////



/////////////////// LOAD MAIN PAGE ///////////////////
app.get('/', function (req, res, next) {
    const apikey = req.query.apikey
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    html = html.replace(/%%APIKEY%%/g, apikey);
    html = html.replace(/%%WEBSOCKET_URL%%/g, is_pm2 ? public_websocket_url : websocket_url);

    res.send(html);
    BettterLog("success", req.connection.remoteAddress.replace("::ffff:", "") + " opened the page using apikey '" + apikey + "'");
});
/////////////////// LOAD MAIN PAGE ///////////////////



/////////////////// ALLOW USE OF ASSETS ///////////////////
app.get('/assets/*', function (req, res, next) {
    const file = req.params[0];
    res.sendFile(path.join(__dirname, 'assets', file));
});
/////////////////// ALLOW USE OF ASSETS ///////////////////



/////////////////// APIKEY REVOKER ///////////////////
setInterval(function () {
    const now = Math.floor(Date.now() / 1000)
    for (const [key, value] of Object.entries(games)) {

        if (now - value.timestamp > 60) { // revoke apikey after 60 seconds
            delete games[key]
            BettterLog("warning", "Revoked apikey '" + key + "' due to inactivity");
        }
    }
}, 1000);
/////////////////// APIKEY REVOKER ///////////////////


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

    // revoke all keys handler
    if (key.name === 'r') { 
        games = {}
        BettterLog("warning", "Revoked all keys");
    }

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

/////////////////// START SERVER ///////////////////
