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
        console.log(msg);

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
    text("$ " + game_data.money, 30, 10);
    text("Lives: " + game_data.health, 30, 45);
    
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

   










    // ========== TOWERS ==========


    // ========== BLOONS ==========


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

