let ws = new WebSocket(websocket_url);

function load_data() {
    ws.send("get_data|" + selected_apikey);

    // get data from websocket
    
}


// on connect
ws.onopen = function () {
    console.log("Connected to websocket")
    setInterval(load_data, 0); // ms
};

ws.onmessage = function (event) {
    let data = JSON.parse(event.data);

    
};