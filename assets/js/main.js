function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

while (maps == undefined) { sleep(1) } // wait for maps to load


// ================================ GLOBAL VARIABLES START ================================
var connected = false;
var websocket_url = "wss://odder.world:3500/";
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

var menu = {
    player_name_input: null,
    game_id_input: null,
    join_button: null,
    start_round_button: null,
    sell_button: null,
    
    dart_monkeys: [],
    bananas: [],
    bloons: [],
    respawn_bloons_button: null
};
var cache = {
    textures: {},
    audio: {},
};

var banner_sway_left = true;
var banner_sway_angle = 0;

var banana_sway_left = true;
var banana_sway_paused = false;

var all_menu_bloons_spawned = false;
// ================================ GLOBAL VARIABLES END ================================


// ================================ SONG MANAGER START ================================
let songs = [
    "Main_Theme",
    "Jazz_Theme",
    "Volcano_Theme",
    "Street_Party_Theme"
];

let sounds = [
    "28_Pop1",
    "29_Pop2",
    "30_Pop3",
    "31_Pop4",
    "18_PlaceTower",
    "61_GameWin",
    "62_Sell",
    "63_GameOver", 
    "68_UnlockedItemClicked",
    "69_Expire",
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
                menu.respawn_bloons_button.hide();
                break;

            case "game_full":
                console.log("Game is full");
                break;

            case "player_joined":
                other_player = args[1];
                menu.start_round_button.show();

                // if song is playing, stop it
                if (song_player != null)
                    song_player.stop();

                // play random song
                song_player = GetAudio(songs[Math.floor(Math.random() * songs.length)]);
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
    for (var i = 0; i < sounds.length; i++)
        GetAudio(sounds[i]);

    for (var i = 0; i < songs.length; i++)
        GetAudio(songs[i]);
    

    song_player = GetAudio(songs[Math.floor(Math.random() * songs.length)]);
}


function setup() {
    createCanvas(windowWidth, windowHeight);

    menu.player_name_input = createInput("");
    menu.player_name_input.attribute("placeholder", "Player Name");
    menu.player_name_input.attribute("maxlength", "15");
    menu.player_name_input.style("position", "absolute");
    menu.player_name_input.style("font-size", "20px");
    menu.player_name_input.style("font-weight", "bold");
    menu.player_name_input.style("border-radius", "10px");
    menu.player_name_input.style("background-color", "white");
    menu.player_name_input.style("border", "none");
    menu.player_name_input.style("outline", "none");
    menu.player_name_input.style("padding", "10px");
    menu.player_name_input.style("box-shadow", "0px 0px 10px 0px rgba(0,0,0,0.75)");
    menu.player_name_input.style("text-align", "center");
    menu.player_name_input.hide();

    menu.game_id_input = createInput("");
    menu.game_id_input.attribute("placeholder", "Game ID");
    menu.game_id_input.attribute("maxlength", "8");
    menu.game_id_input.style("position", "absolute");
    menu.game_id_input.style("font-size", "20px");
    menu.game_id_input.style("font-weight", "bold");
    menu.game_id_input.style("border-radius", "10px");
    menu.game_id_input.style("background-color", "white");
    menu.game_id_input.style("border", "none");
    menu.game_id_input.style("outline", "none");
    menu.game_id_input.style("padding", "10px");
    menu.game_id_input.style("box-shadow", "0px 0px 10px 0px rgba(0,0,0,0.75)");
    menu.game_id_input.style("text-align", "center");
    menu.game_id_input.hide();

    menu.join_button = createButton("Join");
    menu.join_button.style("background-color", "green");
    menu.join_button.style("font-weight", "bold");
    menu.join_button.style("font-size", "20px");
    menu.join_button.style("border-radius", "10px");
    menu.join_button.style("position", "absolute");
    menu.join_button.style("border", "none");
    menu.join_button.style("outline", "none");
    menu.join_button.style("padding", "10px");
    menu.join_button.style("box-shadow", "0px 0px 10px 0px rgba(0,0,0,0.75)");
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

    menu.respawn_bloons_button = createButton("Respawn Bloons");
    menu.respawn_bloons_button.position(width / 2 - 110, height - 70);
    menu.respawn_bloons_button.style("background-color", "rgb(255, 0, 0, 0.5)");
    menu.respawn_bloons_button.style("font-weight", "bold");
    menu.respawn_bloons_button.style("font-size", "20px");
    menu.respawn_bloons_button.style("border-radius", "10px");
    menu.respawn_bloons_button.style("position", "absolute");
    menu.respawn_bloons_button.style("border", "none");
    menu.respawn_bloons_button.style("outline", "none");
    menu.respawn_bloons_button.style("padding", "10px");
    menu.respawn_bloons_button.style("box-shadow", "0px 0px 10px 0px rgba(0,0,0,0.75)");
    menu.respawn_bloons_button.hide();
}

function mousePressed()
{
    if (song_player != null && !song_player.isPlaying())
    {
        song_player.setVolume(0.1);
        song_player.loop();
    }
}

// on resize fit canvas to screen
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function ConnectMenu()
{
    // MENU
    let grass_background = GetTexture("maps/grass");
    if (grass_background != null)
        image(grass_background, 0, 0, grass_background.width, grass_background.height);
 
    // if not connected show connecting screen
    if (!connected) {
        // hide all elements
        for (const [key, value] of Object.entries(menu))
            try { value.hide(); } catch (error) { }

        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        text("Connecting...", width / 2, height / 2);
        return;
    }

    let banana_sprite = GetTexture("other/banana");
    if (banana_sprite != null)
    {
        // randomly spawn bananas on screen
        if (menu.bananas.length < 20)
        {
            // add new banana
            let sprite_pos = [random(0, width), random(0, height)];
            menu.bananas.push({ pos: sprite_pos, eaten: false });
        }

        // draw bananas on menu screen
        for (var i = 0; i < menu.bananas.length; i++)
        {
            let sprite_pos = menu.bananas[i].pos;

            if (menu.bananas[i].angle == null)
            {
                menu.bananas[i].angle = 0;
                menu.bananas[i].speed = random(0.5, 5);
            }

            // rotate banana slowly towards +10 degrees radian
            if (banana_sway_left && !banana_sway_paused)
                menu.bananas[i].angle += 0.05;
            else if (!banana_sway_left && !banana_sway_paused)
                menu.bananas[i].angle -= 0.05;

            if (menu.bananas[i].angle >= 0.45)
                banana_sway_paused = true;
            if (menu.bananas[i].angle <= -0.45)
                banana_sway_paused = true;


            // un-pause banana sway after 1 second
            if (banana_sway_paused)
            {
                if (frameCount % 90 == 0)
                {
                    banana_sway_left = !banana_sway_left;
                    banana_sway_paused = false;
                }
            }


            if (menu.bananas[i].eaten == false)
            {
                push();
                translate(sprite_pos[0] + banana_sprite.width / 2, sprite_pos[1] + banana_sprite.height / 2);
                rotate(menu.bananas[i].angle);
                image(banana_sprite, -banana_sprite.width / 2, -banana_sprite.height / 2, banana_sprite.width, banana_sprite.height);
                pop();
            }
            else
            {
                // on 60th frame, reset banana
                if (frameCount % 60 == 0)
                {
                    // roll random number to see if banana should be reset
                    if (Math.random() > 0.5)
                    {
                        menu.bananas[i].eaten = false;
                        menu.bananas[i].pos = [random(0, width), random(0, height)];
                    }
                }
            }
        }
    }



    // draw bloons walks around like a snake
    let amount = 10;
    if (menu.bloons.length < amount && !all_menu_bloons_spawned)
    {
        // add new bloon
        let sprite_pos = [mouseX == 0 ? width / 2 : mouseX, mouseY == 0 ? height / 2 : mouseY];
        let health = 9;
        let sprite = GetTexture("bloons/" + health);
        menu.bloons.push({ pos: sprite_pos, sprite: sprite, health: health, immune: 0 });

        if (menu.bloons.length == amount)
            all_menu_bloons_spawned = true;
    }

    // move all bloons towards bloon behind it
    for (var i = 0; i < menu.bloons.length; i++)
    {
        let sprite_pos = menu.bloons[i].pos;
        let prev_sprite_pos = [mouseX == 0 ? width / 2 : mouseX, mouseY == 0 ? height / 2 : mouseY];
        if (i != 0)
            prev_sprite_pos = menu.bloons[i - 1].pos;

        menu.bloons[i].speed = 2 * (dist(sprite_pos[0], sprite_pos[1], prev_sprite_pos[0], prev_sprite_pos[1]) / 10);

        let angle_to_prev_bloon = Math.atan2(prev_sprite_pos[1] - sprite_pos[1], prev_sprite_pos[0] - sprite_pos[0]);

        // move bloon slowly towards mouse
        sprite_pos[0] += Math.cos(angle_to_prev_bloon) * menu.bloons[i].speed;
        sprite_pos[1] += Math.sin(angle_to_prev_bloon) * menu.bloons[i].speed;

        // render bloon
        image(menu.bloons[i].sprite, sprite_pos[0] - menu.bloons[i].sprite.width / 2, sprite_pos[1] - menu.bloons[i].sprite.height / 2, menu.bloons[i].sprite.width, menu.bloons[i].sprite.height);
        
        if (menu.bloons[i].immune > 0)
            menu.bloons[i].immune--;
    }

    // check if bloon is within 50 pixels of monkey
    for (var i = 0; i < menu.bloons.length; i++)
    {
        // check if monkey is within 50 pixels of a bloon
        for (var j = 0; j < menu.dart_monkeys.length; j++)
        {
            // if menu.bloons[i] is null, skip it
            if (menu.bloons[i] == null)
                continue;

            let sprite_pos = menu.bloons[i].pos;
            let monkey_pos = menu.dart_monkeys[j].pos;
            let distance = dist(sprite_pos[0], sprite_pos[1], monkey_pos[0] + menu.dart_monkeys[j].sprite.width / 2, monkey_pos[1] + menu.dart_monkeys[j].sprite.height / 2);
            if (distance < 50 && menu.bloons[i].immune == 0)
            {
                // if bloon is within 50 pixels of monkey, pop it
                menu.bloons[i].health--;
                menu.bloons[i].sprite = GetTexture("bloons/" + menu.bloons[i].health);
                menu.bloons[i].immune = 30;
                // play pop sound
                let sound = GetAudio("28_Pop1");
                if (sound != null)
                {
                    sound.setVolume(0.1);
                    sound.play();
                }

                // if bloon has no health left, remove it
                if (menu.bloons[i].health <= 0)
                {
                    menu.bloons.splice(i, 1);
                    i--;
                }
            }
        }
    }



    
    // draw monkeys on screen
    if (menu.dart_monkeys.length < 20)
    {
        // add new dart_monkey
        let sprite_pos = [random(0, width), random(0, height)];

        // roll number, 1 is the most common, 2 is less common, 3 is rare
        let type = 0;

        let roll = Math.random();
        if (roll > 0.9)         type = 3;
        else if (roll > 0.7)    type = 2;
        else                    type = 1;

        let sprite = null;
        switch (type)
        {
            case 1: sprite = GetTexture("towers/dart_monkey"); break;
            case 2: sprite = GetTexture("towers/ninja_monkey"); break;
            case 3: sprite = GetTexture("towers/super_monkey"); break;
        }

        menu.dart_monkeys.push({ pos: sprite_pos, sprite: sprite, speed: random(0.5, 4) * type, angle: 0 });
    }

    // draw dart_monkeys on menu screen
    for (var i = 0; i < menu.dart_monkeys.length; i++)
    {
        let sprite_pos = menu.dart_monkeys[i].pos;

        push();
        translate(sprite_pos[0] + menu.dart_monkeys[i].sprite.width / 2, sprite_pos[1] + menu.dart_monkeys[i].sprite.height / 2);
        rotate(menu.dart_monkeys[i].angle + Math.PI / 2);
        image(menu.dart_monkeys[i].sprite, -menu.dart_monkeys[i].sprite.width / 2, -menu.dart_monkeys[i].sprite.height / 2, menu.dart_monkeys[i].sprite.width, menu.dart_monkeys[i].sprite.height);
        pop();

        // move monkey slowly forward
        sprite_pos[0] += Math.cos(menu.dart_monkeys[i].angle) * menu.dart_monkeys[i].speed;
        sprite_pos[1] += Math.sin(menu.dart_monkeys[i].angle) * menu.dart_monkeys[i].speed;
        // rotate towards closest banana
        let closest_banana = null;
        let closest_banana_distance = 99999;
        for (var j = 0; j < menu.bananas.length; j++)
        {
            let banana = menu.bananas[j];
            if (banana.eaten)
                continue;

            let distance = dist(sprite_pos[0], sprite_pos[1], banana.pos[0], banana.pos[1]);
            if (distance < closest_banana_distance)
            {
                closest_banana_distance = distance;
                closest_banana = banana;
            }
        }

        if (closest_banana != null)
        {
            // change angle slowly towards banana
            let angle_to_banana = Math.atan2(closest_banana.pos[1] - sprite_pos[1], closest_banana.pos[0] - sprite_pos[0]);
            let angle_difference = angle_to_banana - menu.dart_monkeys[i].angle;
            if (angle_difference > Math.PI)
                angle_difference -= Math.PI * 2;
            if (angle_difference < -Math.PI)
                angle_difference += Math.PI * 2;

            menu.dart_monkeys[i].angle += angle_difference * 0.02;
        }

        // if monkey is close to banana, eat it
        if (closest_banana != null && closest_banana_distance < 50)
            closest_banana.eaten = true;

        // if any monkey is out of bounds, move it to the opposite side
        if (sprite_pos[0] < -100)           menu.dart_monkeys[i].pos[0] = width;
        if (sprite_pos[0] > width + 100)    menu.dart_monkeys[i].pos[0] = 0;
        if (sprite_pos[1] < -100)           menu.dart_monkeys[i].pos[1] = height;
        if (sprite_pos[1] > height + 100)   menu.dart_monkeys[i].pos[1] = 0;
    }



    // if connected and game_id is not set show connect screen
    if (connected && game_id == "") {
        fill(0);
        textSize(32);
        textAlign(CENTER, CENTER);
        
        // set position of input field and button
        menu.player_name_input.position(width / 2 - menu.player_name_input.width / 2, height / 2 + 50);
        menu.game_id_input.position(width / 2 - menu.game_id_input.width / 2, height / 2 + 110);
        menu.join_button.position(width / 2 - menu.join_button.width / 2, height / 2 + 180);
        menu.respawn_bloons_button.position(width / 2 - 110, height - 70);

        // size of input field and button
        menu.player_name_input.size(200, 50);
        menu.game_id_input.size(200, 50);
        menu.join_button.size(200, 50);
        menu.respawn_bloons_button.size(220, 50);

        // show connect button and input field
        menu.player_name_input.show();
        menu.game_id_input.show();
        menu.join_button.show();
        menu.respawn_bloons_button.show();

        // set button onclick
        menu.join_button.mousePressed(function () {
            game_id = menu.game_id_input.value();
            ws.send("join|" + game_id + "|" + menu.player_name_input.value());

            // play sound
            let sound = GetAudio("69_Expire");
            if (sound != null)
            {
                sound.setVolume(1);
                sound.play();
            }
        });

        menu.respawn_bloons_button.mousePressed(function () {
            all_menu_bloons_spawned = false;
            menu.bloons = [];

            // play sound
            let sound = GetAudio("68_UnlockedItemClicked");
            if (sound != null)
            {
                sound.setVolume(0.2);
                sound.play();
            }
        });
    }

    if (connected && game_id != "" && other_player == "" && game_data == null) {
        fill(255);
        textSize(32);
        textAlign(CENTER, CENTER);
        strokeWeight(2);
        stroke(0);
        let wtext = "Waiting for other player";
        // add dots to text animation
        for (var i = 0; i < Math.floor(frameCount / 30) % 4; i++)
            wtext += ".";
        text(wtext, width / 2, height / 2 + 100);
        strokeWeight(1);

        // gray 50% opacity filled box around game id text
        fill(0, 0, 0, 100);
        rect(width / 2 - 200 + Math.sin(frameCount / 60) * 10, height / 2 + 150 + Math.sin(frameCount / 30) * 10, 400, 100, 10);

        // game id text
        fill(Math.sin(frameCount / 30) * 127 + 127, Math.sin(frameCount / 30 + 2) * 127 + 127, Math.sin(frameCount / 30 + 4) * 127 + 127);
        textSize(64);
        strokeWeight(2);
        stroke(0);
        text(game_id.toUpperCase(), width / 2 + Math.sin(frameCount / 60) * 10, height / 2 + 200 + Math.sin(frameCount / 30) * 10);
        strokeWeight(1);

        // show instructions
        fill(0);
        textSize(24);
        strokeWeight(2);
        stroke(Math.sin(frameCount / 30) * 127 + 127, Math.sin(frameCount / 30) * 127 + 127, Math.sin(frameCount / 30) * 127 + 127, 255);
        text("Send this Game ID to your friend so they can join", width / 2, height / 2 + 300);
        strokeWeight(1);
    }

    if (connected && other_player == "") {
        // draw banner.png
        let banner = GetTexture("banner");
        if (banner != null)
        {
            // sway smoothly so it slows down at the end
            if (banner_sway_left)
                banner_sway_angle += 0.001;
            else
                banner_sway_angle -= 0.001;

            if (banner_sway_angle > 0.15)
                banner_sway_left = false;
            if (banner_sway_angle < -0.15)
                banner_sway_left = true;

            // draw banner
            push();
            translate(width / 2, 250);
            rotate(banner_sway_angle);
            scale(1 + Math.sin(banner_sway_angle) * 0.6);
            image(banner, -banner.width / 2, -banner.height / 2, banner.width, banner.height);
            pop();
        }
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

