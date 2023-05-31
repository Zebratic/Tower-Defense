class Bloon {
    constructor(health, progress = 0, popped = false) {
        this.progress = progress; // percent of path traveled
        this.health = health;
        this.popped = popped;

        this.Damaged(0); // set speed based on health
    }
    
    Move() {
        this.progress += this.speed;
        if (this.progress >= 1)
            this.progress = 0;
    }

    IsAtEnd() {
        return this.progress >= 1;
    }

    GetPosition(map) 
    {
        return GetXYPositionByPercent(this.progress, map);
    }

    Damaged(damage)
    {
        this.health -= damage;
        if (this.health <= 0)
            return true;

        switch(this.health)
        {
            case 1: this.speed = 0.0010; break;
            case 2: this.speed = 0.0014; break;
            case 3: this.speed = 0.0018; break;
            case 4: this.speed = 0.0032; break;
            case 5: this.speed = 0.0035; break;
            case 6: this.speed = 0.0018; break;
            case 7: this.speed = 0.0020; break;
            case 8: this.speed = 0.0018; break;
            case 9: this.speed = 0.0022; break;
        }

        return false;
    }
}

class Tower {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.last_attack = 0;
    }

    Attack(x, y)
    {   
        // look at target
        this.angle = Math.atan2(y - this.y, x - this.x);

        // check if able to attack
        if (Date.now() - this.last_attack < this.attack_speed)
            return null;

        // create projectile
        this.last_attack = Date.now();
        let projectile = new Projectile(this.x, this.y, this.angle, this.damage, this.projectile_speed);
        return projectile;
    }

    DefineTower(type)
    {
        let tower = tower_list[type];
        if (tower != null)
        {
            // define tower
            this.type = type;
            this.price = tower.price;
            this.range = tower.range;
            this.attack_speed = tower.attack_speed;
            this.projectile_speed = tower.projectile_speed;
            this.damage = tower.damage;
            this.sell_value = tower.sell_value;
        }
    }
}

class Projectile {
    constructor(x, y, angle, damage, speed) {
        this.x = x;
        this.y = y;
        this.angle = angle
        this.damage = damage;
        this.speed = speed;
    }

    Move() {
        this.x += this.speed * Math.cos(this.angle);
        this.y += this.speed * Math.sin(this.angle);
    }
}


function GetXYPositionByPercent(percent, map)
{
    // get position on the path by percent also take into account so that the player moves the same speed no matter the distance between points
    let total_distance = 0;
    for (var i = 0; i < map.path.length - 1; i++)
        total_distance += Math.sqrt(Math.pow(map.path[i + 1][0] - map.path[i][0], 2) + Math.pow(map.path[i + 1][1] - map.path[i][1], 2));

    let current_distance = total_distance * percent;
    let current_distance_on_path = 0;
    for (var i = 0; i < map.path.length - 1; i++)
    {
        let distance = Math.sqrt(Math.pow(map.path[i + 1][0] - map.path[i][0], 2) + Math.pow(map.path[i + 1][1] - map.path[i][1], 2));
        if (current_distance_on_path + distance >= current_distance)
        {
            let percent = (current_distance - current_distance_on_path) / distance;
            return [map.path[i][0] + (map.path[i + 1][0] - map.path[i][0]) * percent, map.path[i][1] + (map.path[i + 1][1] - map.path[i][1]) * percent];
        }
        else
            current_distance_on_path += distance;
    }
    return null;
}


var tower_list = {
    "dart_monkey": {
        price: 200,
        range: 500,
        attack_speed: 1,
        projectile_speed: 0.01,
        damage: 1,
        sell_value: 100,
    }
};


// For NodeJS ignore if not using NodeJS
try
{
    exports.Bloon = Bloon;
    exports.Tower = Tower;
    exports.Projectile = Projectile;
    exports.tower_list = tower_list;
}
catch (e) { }