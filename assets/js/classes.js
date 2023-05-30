class Bloon {
    constructor(health) {
        this.progress = 0; // percent
        this.health = health;

        Damaged(0); // set speed based on health
    }
    
    Move() {
        this.progress += this.speed;
        if (this.progress >= 1)
            this.progress = 0;
        
    }

    IsAtEnd() {
        return this.progress >= 1;
    }

    GetPosition() 
    {
        return GetXYPositionByPercent(this.progress);
    }

    Damaged(damage) {
        
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
    constructor(type) {
        this.type = type;
        this.x = 0;
        this.y = 0;
        this.range = 0;
        this.attack_speed = 0;
        this.damage = 0;
        this.id = 0;
        this.sell_value = 0;
    }
    Render()
    {
        let sprite = GetTexture(this.type);
        if (sprite == null)
            return;

        image(sprite, this.x, this.y, sprite.width, sprite.height);
    }

    FindNearestBloon()
    {
        let nearest = null;
        let nearest_distance = 0;
        for (var i = 0; i < game_data.bloons.length; i++)
        {
            let bloon = game_data.bloons[i];
            let distance = dist(this.x, this.y, bloon.GetPosition()[0], bloon.GetPosition()[1]);
            if (distance <= this.range)
            {
                if (nearest == null || distance < nearest_distance)
                {
                    nearest = bloon;
                    nearest_distance = distance;
                }
            }
        }
        return nearest;
    }

    Attack(bloon)
    {
        // shoot towards bloon
        
        
    }
}

class projectile {
    constructor(x, y, speed) {
        this.x = x;
        this.y = y;
        this.speed = 0;

    }
    
}




function GetXYPositionByPercent(percent)
{
    // get position on the path by percent also take into account so that the player moves the same speed no matter the distance between points
    let map = maps[game_data.map];
    if (map == null)
        return null;

    let total_distance = 0;
    for (var i = 0; i < map.path.length - 1; i++)
        total_distance += dist(map.path[i][0], map.path[i][1], map.path[i + 1][0], map.path[i + 1][1]);

    let current_distance = total_distance * percent;
    let current_distance_on_path = 0;
    for (var i = 0; i < map.path.length - 1; i++)
    {
        let distance = dist(map.path[i][0], map.path[i][1], map.path[i + 1][0], map.path[i + 1][1]);
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