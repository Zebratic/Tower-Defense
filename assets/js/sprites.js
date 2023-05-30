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