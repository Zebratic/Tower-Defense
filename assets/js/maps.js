var maps = {
    "monkey_meadows": {
        path: [
            [-5, 375], // out of bounds
            [830, 375],
            [830, 135],
            [560, 135],
            [560, 777],
            [300, 777],
            [300, 545],
            [1060, 545],
            [1060, 290],
            [1245, 290],
            [1245, 700],
            [745, 700],
            [745, 1100] // out of bounds
        ],
    },
    "area51": {
        path: [
            [243, -40], // out of bounds
            [243, 135],
            [610, 135],
            [610, 495],
            [250, 495],
            [250, 930],
            [615, 930],
            [615, 599],
            [730, 599],
            [730, 145],
            [1400, 145],
            [1400, 480],
            [1080, 480],
            [1080, 595],
            [1400, 595],
            [1400, 1030] // out of bounds
        ],
    },
    "cubism": {
        path: [
            [-24, 126], // out of bounds
            [967, 706],
            [1011, 504],
            [363, 686],
            [252, 464],
            [1330, 259],
            [1318, 494],
            [871, 30],
            [550, 588],
            [981, 959],
            [1559, 603],
            [1217, 655],
            [1678, 763] // out of bounds
        ],
    }
};

function distToSegment(x, y, x1, y1, x2, y2) {
    let A = x - x1;
    let B = y - y1;
    let C = x2 - x1;
    let D = y2 - y1;

    let dot = A * C + B * D;
    let len_sq = C * C + D * D;
    let param = -1;
    if (len_sq != 0)
        param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    let dx = x - xx;
    let dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

try {
    module.exports = {
        maps: maps,
        distToSegment: distToSegment
    }
}
catch (e) { }