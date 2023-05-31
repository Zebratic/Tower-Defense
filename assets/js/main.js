// wait for maps to load
while (maps == undefined) { sleep(100); }

// ================================ GLOBAL VARIABLES START ================================
var connected = false;
var websocket_url = "ws://localhost:3500/";
var ws = null;

// game info
var game_id = "";
var other_player = "";
var game_data = null;
var should_get_data = false;

let menu = {
    player_name_input: null,
    game_id_input: null,
    join_button: null,
    dart_monkeys: [],
};
let cache = {
    textures: {},
};
// ================================ GLOBAL VARIABLES END ================================




// ================================ WEBSOCKET START ================================
function SetupEventListeners() {
    ws.onopen = function () {
        connected = true;
        console.log("Connected to websocket");
    };

    ws.onclose = function () {
        connected = false;
        other_player = "";
        game_id = "";
        game_data = null;
        console.log("Disconnected from websocket");
    };

    ws.onmessage = function (event) {
        let msg = event.data;

        let args = msg.split("|");

        switch (args[0]) {
            case "game_created":
                game_id = args[1];

                menu.player_name_input.hide();
                menu.game_id_input.hide();
                menu.join_button.hide();
                break;

            case "game_full":
                console.log("Game is full");
                break;

            case "player_joined":
                other_player = args[1];
                break;

            case "player_left":
                other_player = "";
                break;

            case "game_data":
                game_data = JSON.parse(args[1]);
                break;
        }
    };
}

function ReconnectLoop()
{
    if (!connected) {
        ws = new WebSocket(websocket_url);
        SetupEventListeners();
    }
}

// loop attempt to reconnect
setInterval(ReconnectLoop, 5000);
ReconnectLoop(); // initial connect
// ================================ WEBSOCKET END ================================




function setup() {
    createCanvas(windowWidth, windowHeight);

    menu.player_name_input = createInput("");
    menu.player_name_input.hide();
    menu.player_name_input.attribute("placeholder", "Player Name");
    
    menu.game_id_input = createInput("");
    menu.game_id_input.hide();
    menu.game_id_input.attribute("placeholder", "Game ID");

    menu.join_button = createButton("Join");
    menu.join_button.hide();
}

// on resize fit canvas to screen
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function ConnectMenu()
{
    // MENU
    background(255);
 
    // if not connected show connecting screen
    if (!connected) {
        // hide all elements
        for (const [key, value] of Object.entries(menu))
            try { value.hide(); } catch (error) { }

        background(200);
        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Connecting...", width / 2, height / 2);
        return;
    }

    // if connected and game_id is not set show connect screen
    if (connected && game_id == "") {
        background(200);
        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        
        // set position of input field and button
        menu.player_name_input.position(width / 2 - menu.player_name_input.width / 2, height / 2 - 110);
        menu.game_id_input.position(width / 2 - menu.game_id_input.width / 2, height / 2 - 55);
        menu.join_button.position(width / 2 - menu.join_button.width / 2, height / 2);

        // size of input field and button
        menu.player_name_input.size(200, 50);
        menu.game_id_input.size(200, 50);
        menu.join_button.size(200, 50);

        // show connect button and input field
        menu.player_name_input.show();
        menu.game_id_input.show();
        menu.join_button.show();

        // set button onclick
        menu.join_button.mousePressed(function () {
            game_id = menu.game_id_input.value();
            
            ws.send("join|" + game_id + "|" + menu.player_name_input.value());
        });

        
        // check if dart_monkey sprite is loaded in cache
        let sprite = GetTexture("towers/dart_monkey");
        if (sprite != null)
        {
            // get mouse position
            let mouse_pos = [mouseX, mouseY];
            if (mouse_pos[0] == 0 && mouse_pos[1] == 0)
                mouse_pos = [width / 2, height / 2];


            // draw 10 random dart_monkeys on screen
            if (menu.dart_monkeys.length < 10)
            {
                // add new dart_monkey
                let sprite_pos = [random(0, width), random(0, height)];
                // prevent dart_monkey from spawning in the middle within 200 pixels
                if (sprite_pos[0] > width / 2 - 200 && sprite_pos[0] < width / 2 + 200)
                    sprite_pos[0] = random(0, width);
                if (sprite_pos[1] > height / 2 - 200 && sprite_pos[1] < height / 2 + 200)
                    sprite_pos[1] = random(0, height);

                menu.dart_monkeys.push({ pos: sprite_pos });
            }

            // draw dart_monkeys
            for (var i = 0; i < menu.dart_monkeys.length; i++)
            {
                let sprite_pos = menu.dart_monkeys[i].pos;
                // draw dart_monkey so its looking at mouse
                let angle = Math.atan2(mouse_pos[1] - (sprite_pos[1] + sprite.height / 2), mouse_pos[0] - (sprite_pos[0] + sprite.width / 2));
                push();
                translate(sprite_pos[0] + sprite.width / 2, sprite_pos[1] + sprite.height / 2);
                rotate(angle + Math.PI / 2);
                image(sprite, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
                pop();
            }

        }



         
        

        return;
    }

    if (connected && game_id != "" && other_player == "" && game_data == null) {
        background(200);
        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Waiting for other player...", width / 2, height / 2);
        fill(255, 0, 0);
        text(game_id, width / 2, height / 2 + 50);
        return;
    }
}


// ================================ DRAW LOOP START ================================
function draw() {
    // if connected and game_id is set show game screen
    if (connected && game_id != "" && other_player != "")
    {
        should_get_data = true;
        if (game_data != null)
            GameLoop();
    }
    else
    {
        should_get_data = false;
        ConnectMenu();
    }
}
// ================================ DRAW LOOP END ================================


// ================================ GAME LOOP START ================================
let current_tick = 0;
let player_pos_percent = 0;
function GameLoop()
{
    current_tick = game_data.timestamp; // value example: 168547311870

    background(255);
    let map = maps[game_data.map];
    if (map == null)
        return;

    // LOAD MAP
    let map_img = GetTexture("maps/" + game_data.map);
    if (map_img != null)
        image(map_img, 0, 0, map_img.width, map_img.height);


    // ===== DEBUG PATH =====
    // draw line from point to point
    stroke(255, 0, 0);
    strokeWeight(5);
    for (var i = 0; i < map.path.length - 1; i++)
        line(map.path[i][0], map.path[i][1], map.path[i + 1][0], map.path[i + 1][1]);
    strokeWeight(1);
    stroke(0);
    // ===== DEBUG PATH =====



    // ========== UI ==========
    
    // draw money in left top corner
    fill(0);
    textSize(32);
    textAlign(LEFT, TOP);
    strokeWeight(3);
    fill(255, 255, 0);
    text("🪙 " + (game_data.money == undefined ? 650 : game_data.money), 30, 10);
    fill(255, 0, 0);
    text("💓 " + (game_data.health == undefined ? 100 : game_data.health), 30, 50);
    if (game_data.wave != null && game_data.wave.round != null)
    {
        fill(0, 150, 255);
        text("🔁 " + (game_data.wave.round == undefined ? 0 : game_data.wave.round), 30, 90);
    }
    strokeWeight(1);
    
    // draw play button at 1650x884
    fill(0, 255, 0);
    rect(1650, 884, 100, 60);
    fill(0);
    textSize(28);
    textAlign(CENTER, CENTER);
    text("START", 1700, 914);

    // on click play button
    if (mouseIsPressed && mouseX > 1650 && mouseX < 1750 && mouseY > 884 && mouseY < 944)
        ws.send("update_data|start_round");

   









    // ========== BLOONS ==========
    if (game_data.wave != null && game_data.wave.bloons != null)
    {
        for (var i = 0; i < game_data.wave.bloons.length; i++)
        {
            // {"players":[{"ip":"::1","username":"dsads","score":0,"uid":9117},{"ip":"::1","username":"dsads","score":0,"uid":7890}],"timestamp":168552138924,"map":"monkey_meadows","wave":{"started":false,"round":2,"bloons":[{"progress":0.8210000000000006,"health":0,"speed":0.001},{"progress":0.8120000000000006,"health":0,"speed":0.001},{"progress":0.8040000000000006,"health":0,"speed":0.001},{"progress":0.7950000000000006,"health":0,"speed":0.001},{"progress":0.7870000000000006,"health":0,"speed":0.001},{"progress":0.7770000000000006,"health":0,"speed":0.001},{"progress":0.7680000000000006,"health":0,"speed":0.001},{"progress":0.7590000000000006,"health":0,"speed":0.001},{"progress":0.7500000000000006,"health":0,"speed":0.001},{"progress":0.7420000000000005,"health":0,"speed":0.001},{"progress":0.7330000000000005,"health":0,"speed":0.001},{"progress":0.7250000000000005,"health":0,"speed":0.001},{"progress":0.7160000000000005,"health":0,"speed":0.001},{"progress":0.7070000000000005,"health":0,"speed":0.001},{"progress":0.6980000000000005,"health":0,"speed":0.001},{"progress":0.6900000000000005,"health":0,"speed":0.001},{"progress":0.6810000000000005,"health":0,"speed":0.001},{"progress":0.6720000000000005,"health":0,"speed":0.001},{"progress":0.6640000000000005,"health":0,"speed":0.001},{"progress":0.6550000000000005,"health":0,"speed":0.001}],"last_spawn":168552138129,"spawn_interval":"10","total_bloons":20},"health":100,"money":650}
            let bloon = game_data.wave.bloons[i];
            if (bloon == null || bloon == false) // non existent or already popped
                continue;

            let pos = GetXYPositionByPercent(bloon.progress);
            fill(255, 0, 0);
            circle(pos[0], pos[1], 20);
            console.log(pos);
        }
    }



    // ========== TOWERS ==========


    // ========== PROJECTILES ==========


    // ==========  ==========
}


function GetGameData()
{
    if (should_get_data)
        ws.send("get_data|" + game_id);
}
setInterval(GetGameData, 0);
// ================================ GAME LOOP END ================================

