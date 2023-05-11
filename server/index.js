// =================== SETUP ===================
const express = require('express');
const app = express();
const expressWs = require('express-ws')(app);
const port = 3000;
app.use(express.static(__dirname + '/../')); 



// =================== HTTP ===================
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// =================== WEBSOCKET ===================
app.ws('/', (ws, req) => {
    console.log('Websocket connection received from ' + req.ip);

    // when a message is received from the client, log it
    ws.on('message', (message) => {
        console.log('[' + req.ip + '] ' + message);

        




        ws.send('Hello from server!'); // respond to client
    });
    
    // when the websocket is closed, log it
    ws.on('close', () => {
        console.log('Websocket connection closed from ' + req.ip);
    });
});


// =================== START SERVER ===================
app.listen(port, () => {
    console.log(`Now listening on *:${port}`);
});

