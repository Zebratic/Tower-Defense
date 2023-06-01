function GetTexture(url) 
{
    let src = url;

    // if doesnt contain http, its local
    if (!url.includes("http"))
        src = "./assets/imgs/" + url + ".png";

    // if not cached, cache it
    if (cache.textures[src] == null)
        cache.textures[src] = loadImage(src);

    return cache.textures[src];
}

function GetAudio(url)
{
    let src = url;

    // if doesnt contain http, its local
    if (!url.includes("http"))
        src = "./assets/sounds/" + url + ".mp3";

    // if not cached, cache it
    if (cache.audio[src] == null)
        cache.audio[src] = loadSound(src);

    return cache.audio[src];
}