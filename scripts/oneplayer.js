var canvas = document.getElementById("canvas");
var context = canvas.getContext("2d");
var maxHeight = 0; 
var coverMin = 1.0;
var coverMax = 1.0;
var peakPosMin = 0.25;
var peakPosMax = 0.75;

function randRange(a, b) { 
    return a + Math.random() * (b - a); 
}

function limit(v, a, b) { 
    return Math.max(a, Math.min(b, v)); 
}

function generateMountain(width, mountHeight) {
    let height = [];
    height[0] = maxHeight;
    height[width - 1] = maxHeight;
    function divide(left, right, rough) {
        if (right - left <= 1){
            return;
        }
        let mid = Math.floor((left + right) / 2);
        let avg = (height[left] + height[right]) / 2;
        let displacement = (Math.random() - 0.5) * rough;
        height[mid] = limit(avg + displacement, maxHeight - mountHeight, maxHeight);
        divide(left, mid, rough / 1.8);
        divide(mid, right, rough / 1.8);
    }
    let peakX = Math.floor(randRange(width * peakPosMin, width * peakPosMax));
    height[peakX] = maxHeight - mountHeight;
    divide(0, peakX, mountHeight / 2);
    divide(peakX, width - 1, mountHeight / 2);
    return height;
}

function mountainGenerate(height, fillStyle, strokeStyle) {
    context.beginPath();
    context.moveTo(0, maxHeight);
    for (var x = 0; x < height.length; x++) {
        context.lineTo(x, height[x]);
    }
    context.lineTo(height.length - 1, maxHeight);
    context.closePath();
    context.fillStyle = fillStyle;
    context.fill();
    context.strokeStyle = strokeStyle;
    context.stroke();
}

function terrainGenerate() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    maxHeight = canvas.height;
    context.clearRect(0, 0, canvas.width, canvas.height);
    var mountHeight = maxHeight * 0.9;
    var height = generateMountain(canvas.width, mountHeight);
    window.terrainHeight = height; 
    var fill = "darkgreen";
    var stroke = "darkgreen";
    mountainGenerate(height, fill, stroke);
}

window.addEventListener("resize", terrainGenerate); 
terrainGenerate();

window.getGroundHeightAt = function (x) {
    x = Math.floor(limit(x, 0, canvas.width - 1));
    return (window.terrainHeight && window.terrainHeight[x]) || maxHeight;
};