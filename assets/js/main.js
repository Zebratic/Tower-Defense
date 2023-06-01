function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

while (maps == undefined) { sleep(1) } // wait for maps to load


// ================================ GLOBAL VARIABLES START ================================
var connected = false;
var websocket_url = "wss://b939-141-98-254-179.ngrok-free.app/";
var ws = null;

// game info
var game_id = "";
var other_player = "";
var game_data = null;
var should_get_data = false;
var drag_handler = {
    tower: null,
    is_selected: false,
    is_dragging: false,
};

let menu = {
    player_name_input: null,
    game_id_input: null,
    join_button: null,
    start_round_button: null,
    sell_button: null,
    
    dart_monkeys: [],
};
let cache = {
    textures: {},
    audio: {},
};
// ================================ GLOBAL VARIABLES END ================================


// ================================ SONG MANAGER START ================================
let songs = [
    "Main_Theme",
    "Jazz_Theme",
    "Volcano_Theme"
];

let sounds = [
    "28_Pop1",
    "29_Pop2",
    "30_Pop3",
    "31_Pop4",
    "18_PlaceTower",
    "62_Sell"
];
let song_player = null;
// ================================ SONG MANAGER END ================================


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
                menu.start_round_button.show();

                // play random song
                song_player= GetAudio(songs[Math.floor(Math.random() * songs.length)]);
                song_player.loop();
                song_player.setVolume(0.1);
                break;

            case "player_left":
                other_player = "";
                game_id = "";
                game_data = null;
                menu.start_round_button.hide();
                if (song_player != null)
                    song_player.stop();
                break;

            case "game_data":
                game_data = JSON.parse(args[1]);
                break;

            case "round_started":
                menu.start_round_button.attribute("disabled", "true");
                menu.start_round_button.style("background-color", "gray");
                break;

            case "round_over":
                menu.start_round_button.removeAttribute("disabled");
                menu.start_round_button.style("background-color", "");
                break;

            case "game_over":
                other_player = "";
                game_id = "";
                game_data = null;
                break;

            case "play_sound":
                let sound = GetAudio(args[1]);
                if (sound != null)
                {
                    sound.setVolume(0.5);
                    sound.play();
                }
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


function preload() {
    for (var i = 0; i < songs.length; i++)
        GetAudio(songs[i]);

    for (var i = 0; i < sounds.length; i++)
        GetAudio(sounds[i]);
}


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

    menu.start_round_button = createButton("START");
    menu.start_round_button.position(1660, 884);
    menu.start_round_button.size(220, 50);
    menu.start_round_button.style("background-color", "green");
    menu.start_round_button.style("font-weight", "bold");
    menu.start_round_button.style("font-size", "20px");
    menu.start_round_button.style("border-radius", "10px");
    menu.start_round_button.style("position", "absolute");
    menu.start_round_button.hide();

    menu.sell_button = createButton("SELL");
    menu.sell_button.position(1660, 10);
    menu.sell_button.size(220, 50);
    menu.sell_button.style("background-color", "red");
    menu.sell_button.style("font-weight", "bold");
    menu.sell_button.style("font-size", "20px");
    menu.sell_button.style("border-radius", "10px");
    menu.sell_button.style("position", "absolute");
    menu.sell_button.hide();
    

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

            // draw dart_monkeys on menu screen
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


    // ========== UI ==========
    
    // draw money in left top corner
    fill(0);
    textSize(32);
    textAlign(LEFT, TOP);
    strokeWeight(4);
    stroke(0);
    fill(255, 255, 0);
    text("💰 " + game_data.money, 30, 10);
    fill(255, 0, 0);
    text("💓 " + game_data.health, 30, 50);
    if (game_data.wave != null && game_data.wave.round != null)
    {
        fill(0, 150, 255);
        text("🔁 " + game_data.wave.round, 30, 90);
    }
    strokeWeight(1);
    
    // START BUTTON
    menu.start_round_button.mousePressed(function () {
        ws.send("update_data|start_round");
        menu.start_round_button.attribute("disabled", "true");
        menu.start_round_button.style("background-color", "gray");
    });
    

    // ========== TOWERS ==========
    if (game_data.towers != null)
    {
        for (var i = 0; i < game_data.towers.length; i++)
        {
            //render towers
            let tower = game_data.towers[i];
            tower = new Tower(tower.type, tower.x, tower.y, tower.angle);
            let sprite = GetTexture("towers/" + tower.type);
            if (sprite != null)
            {
                // draw tower so it looks at tower.angle and is centered on tower.x and tower.y
                push();
                translate(tower.x, tower.y);
                rotate(tower.angle + Math.PI / 2);
                image(sprite, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
                pop();
            }
        }
    }

    
    // ========== BLOONS ==========
    if (game_data.wave != null && game_data.wave.bloons != null)
    {
        for (var i = 0; i < game_data.wave.bloons.length; i++)
        {
            let bloon = game_data.wave.bloons[i];
            bloon = new Bloon(bloon.health, bloon.progress);
            if (bloon == null || bloon == false || bloon.popped) // non existent or already popped
                continue;

            let pos = bloon.GetPosition(maps[game_data.map]);
            if (pos != null)
            {
                let sprite = GetTexture("bloons/" + bloon.health);
                if (sprite != null)
                {
                    image(sprite, pos[0] - sprite.width / 2, pos[1] - sprite.height / 2, sprite.width, sprite.height);
                }
            }
        }
    }

    // if mouse clicked on a tower, select it in drag_handler
    if (mouseIsPressed && !drag_handler.is_dragging)
    {
        let found_tower = false;
        for (var i = 0; i < game_data.towers.length; i++)
        {
            let tower = game_data.towers[i];
            let sprite = GetTexture("towers/" + tower.type);
            if (sprite != null)
            {
                if (mouseX > tower.x - sprite.width / 2 && mouseX < tower.x + sprite.width / 2 && mouseY > tower.y - sprite.height / 2 && mouseY < tower.y + sprite.height / 2)
                {
                    found_tower = true;
                    drag_handler.tower = tower;
                    drag_handler.is_selected = true;
                    break;
                }
            }
        }

        if (!found_tower)
        {
            drag_handler.is_selected = false;
            drag_handler.tower = null;
            menu.sell_button.hide();
        }                
    }

    // if tower is selected
    if (drag_handler.is_selected)
    {
        //draw a sell button
        // update text to show sell value
        if (tower_list[drag_handler.tower.type] != null)
        {
            menu.sell_button.html("SELL $" + tower_list[drag_handler.tower.type].sell_value);
            menu.sell_button.show();
            menu.sell_button.mousePressed(function () {
                ws.send("update_data|sell_tower|" + drag_handler.tower.x + "|" + drag_handler.tower.y);
            });
        }

        // draw range circle
        fill(0, 0, 0, 100);
        circle(drag_handler.tower.x, drag_handler.tower.y, drag_handler.tower.range);
    }


    // ========== PROJECTILES ==========
    if (game_data.projectiles != null)
    {
        for (var i = 0; i < game_data.projectiles.length; i++)
        {
            let projectile = game_data.projectiles[i];
            if (projectile == null)
                continue;

            projectile = new Projectile(projectile.type, projectile.x, projectile.y, projectile.angle, projectile.damage, projectile.speed, projectile.health);
            let sprite = GetTexture("other/" + projectile.type);
            if (sprite != null)
            {
                // draw projectile so it looks at projectile.angle and is centered on projectile.x and projectile.y
                push();
                translate(projectile.x, projectile.y);
                rotate(projectile.angle + Math.PI / 2);
                image(sprite, -sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
                pop();
            }
        }
    }



    // ========== DRAG ENTITY ==========
    if (drag_handler.is_dragging && drag_handler.tower != null)
    {
        if (drag_handler.tower != null)
        {
            let sprite = GetTexture("towers/" + Object.keys(tower_list)[Object.values(tower_list).indexOf(drag_handler.tower)]);
            if (sprite != null)
            {
                // check if tower can be placed
                let can_place = true;
                let mouse_pos = [mouseX, mouseY];
                if (mouse_pos[0] == 0 && mouse_pos[1] == 0)
                    mouse_pos = [width / 2, height / 2];

                // check if mouse is close to full path line calculated by all points
                for (var i = 0; i < map.path.length - 1; i++)
                {
                    let point1 = map.path[i];
                    let point2 = map.path[i + 1];
                    let distance = distToSegment(mouse_pos[0], mouse_pos[1], point1[0], point1[1], point2[0], point2[1]);
                    if (distance <= 50)
                    {
                        can_place = false;
                        break;
                    }
                }


                // check if mouse is close to other towers within 50 pixels
                if (game_data.towers == null)
                    game_data.towers = [];

                for (var i = 0; i < game_data.towers.length; i++)
                {
                    let tower = game_data.towers[i];
                    let distance = dist(mouse_pos[0], mouse_pos[1], tower.x, tower.y);
                    if (distance <= 50)
                    {
                        can_place = false;
                        break;
                    }
                }

                // check if mouse is on screen
                if (mouse_pos[0] < 0 || mouse_pos[0] > width || mouse_pos[1] < 0 || mouse_pos[1] > height)
                    can_place = false;
                    
                // check if mouse is on map
                if (mouse_pos[0] > 1642 || mouse_pos[0] < 24 || mouse_pos[1] > 951 || mouse_pos[1] < 50)
                    can_place = false;
                
                if (can_place)
                {
                    // draw gray 50% opacity filled circle around mouse
                    fill(0, 0, 0, 100);
                    circle(mouse_pos[0], mouse_pos[1], drag_handler.tower.range);

                    image(sprite, mouseX - sprite.width / 2, mouseY - sprite.height / 2, sprite.width, sprite.height);

                    // if mouse released, place tower
                    if (!mouseIsPressed)
                    {
                        console.log("placed tower");
                        ws.send("update_data|place_tower|" + Object.keys(tower_list)[Object.values(tower_list).indexOf(drag_handler.tower)] + "|" + mouseX + "|" + mouseY);
                        drag_handler.is_dragging = false;
                    }
                }
                else
                {
                    // draw red 50% opacity filled circle around mouse
                    fill(255, 0, 0, 100);
                    circle(mouse_pos[0], mouse_pos[1], drag_handler.tower.range);

                    // red overlay
                    tint(255, 0, 0, 100);
                    image(sprite, mouseX - sprite.width / 2, mouseY - sprite.height / 2, sprite.width, sprite.height);
                    noTint();
                }
            }
        }
    }

    if (!mouseIsPressed)
        drag_handler.is_dragging = false;


    // ========== OVERLAY ==========
    let overlay_img = GetTexture("maps/overlay");
    if (overlay_img != null)
        image(overlay_img, 0, 0, overlay_img.width, overlay_img.height);



    // ========== BUY TOWER BUTTONS ==========
    for (var i = 0; i < Object.keys(tower_list).length; i++)
    {
        let tower = tower_list[Object.keys(tower_list)[i]];
        let sprite = GetTexture("towers/" + Object.keys(tower_list)[i]);
        if (sprite == null)
            continue;

        // from x = 1662, y = 90
        let x = 1662 + (i % 2) * 110;
        let y = 90 + Math.floor(i / 2) * 110;
        
        image(sprite, x, y, 110, 110);

        // draw price bottom right of tower
        fill(0);
        textSize(28);
        textAlign(RIGHT, BOTTOM);
        strokeWeight(3);
        fill(255, 255, 0);
        text(tower.price, x + 100, y + 100);
        strokeWeight(1);

        // if dragged
        if (!drag_handler.is_dragging && !drag_handler.is_selected)
        {
            if (mouseIsPressed && mouseX > x && mouseX < x + sprite.width && mouseY > y && mouseY < y + sprite.height)
            {
                drag_handler.tower = tower;
                drag_handler.is_dragging = true;
            }
        }
    }
}


function GetGameData()
{
    if (should_get_data)
        ws.send("get_data|" + game_id);
}
setInterval(GetGameData, 0);
// ================================ GAME LOOP END ================================

