const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const fireButton = document.querySelector(".firebtn");

let maxHeight = 0;
const tankWidth = 30;
const tankHeight = 20;
const offsetAboveTerrain = 8;
const gravity = 0.8;

let currentTurn = "tank1";

let tankChances = 0;


let gameOver = false;







function randRange(a, b) { return a + Math.random() * (b - a); }
function limit(v, a, b) { return Math.max(a, Math.min(b, v)); }
const peakPosMin = 0.45;
const peakPosMax = 0.75;

window.terrainHeight = [];
let tank1 = { x: 0, y: 0, color: "blue" };
let tank2 = { x: 0, y: 0, color: "red" };

function generateMountain(width, mountHeight) {
    const height = new Array(width);
    height[0] = maxHeight;
    height[width - 1] = maxHeight;

    function divide(left, right, rough) {
        if (right - left <= 1) return;
        const mid = Math.floor((left + right) / 2);
        const avg = (height[left] + height[right]) / 2;
        const displacement = (Math.random() - 0.5) * rough;
        height[mid] = avg + displacement;
        divide(left, mid, rough / 1.8);
        divide(mid, right, rough / 1.8);
    }

    const peakX = Math.floor(randRange(width * peakPosMin, width * peakPosMax));
    height[peakX] = maxHeight - mountHeight;
    divide(0, peakX, mountHeight / 2);
    divide(peakX, width - 1, mountHeight / 2);

    for (let x = 0; x < width; x++) {
        if (height[x] === undefined) {
            let l = x - 1;
            while (l >= 0 && height[l] === undefined) l--;
            let r = x + 1;
            while (r < width && height[r] === undefined) r++;
            if (l >= 0 && r < width) height[x] = (height[l] + height[r]) / 2;
            else height[x] = maxHeight;
        }
        height[x] = limit(height[x], maxHeight - mountHeight, maxHeight);
    }

    window.terrainHeight = height;
    return height;
}

function drawTerrain(heightArr) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    context.moveTo(0, maxHeight);
    for (let x = 0; x < heightArr.length; x++) {
        context.lineTo(x, heightArr[x]);
    }
    context.lineTo(canvas.width - 1, maxHeight);
    context.closePath();
    context.fillStyle = "darkgreen";
    context.fill();
    context.strokeStyle = "darkgreen";
    context.stroke();
}

function drawTank(tank) {
    context.fillStyle = tank.color;
    context.fillRect(Math.round(tank.x - tankWidth / 2), Math.round(tank.y), tankWidth, tankHeight);  // I drawn tank

    context.fillRect(Math.round(tank.x - 2), Math.round(tank.y - 10), 4, 10); // I drawn its turret
}

function drawTanks() {
    drawTank(tank1);
    drawTank(tank2);
}

function getTankY(x) {
    const xi = Math.floor(limit(Math.round(x), 0, canvas.width - 1));
    const ground = (window.terrainHeight && window.terrainHeight[xi]) || maxHeight;
    return ground - tankHeight - offsetAboveTerrain;
}

function getRandomTankX(startX, endX) {
    const min = Math.max(0, Math.floor(startX));
    const max = Math.min(canvas.width - 1, Math.floor(endX));
    if (max - min <= 0) return Math.floor((min + max) / 2);
    return Math.floor(randRange(min + 10, max - 10));
}

function explode(x, y, radius, shooter) {
    const left = Math.max(0, Math.floor(x - radius));
    const right = Math.min(canvas.width - 1, Math.floor(x + radius));
    for (let i = left; i <= right; i++) {
        const dx = i - x;
        const inside = radius * radius - dx * dx;
        if (inside <= 0) continue;
        const dy = Math.sqrt(inside);
        const newGround = Math.min(maxHeight, Math.max(0, y + dy));
        window.terrainHeight[i] = Math.max(window.terrainHeight[i], newGround);
    }

    tank1.y = getTankY(tank1.x);
    tank2.y = getTankY(tank2.x);

    if (isTankHit(tank1, x, y, radius) && shooter === "tank2") {
        const sc1Input = document.getElementById("sc1");
        sc1Input.value = parseInt(sc1Input.value || 0) + 10;
        console.log("Tank1 hit! Score:", sc1Input.value);
    }
    if (isTankHit(tank2, x, y, radius) && shooter === "tank1") {
        const sc2Input = document.getElementById("sc2");
        sc2Input.value = parseInt(sc2Input.value || 0) + 10;
        console.log("Tank2 hit! Score:", sc2Input.value);
    }

    drawEverything();
}

function isTankHit(tank, x, y, radius) {
    const tankLeft = tank.x - tankWidth / 2;
    const tankRight = tank.x + tankWidth / 2;
    const tankTop = tank.y;
    const tankBottom = tank.y + tankHeight;

    const closestX = Math.max(tankLeft, Math.min(x, tankRight));
    const closestY = Math.max(tankTop, Math.min(y, tankBottom));

    const dx = closestX - x;
    const dy = closestY - y;

    return dx * dx + dy * dy <= radius * radius;
}
function checkGameOver() {
    if (gameOver) return;

    const sc1 = parseInt(document.getElementById("sc1").value || 0);
    const sc2 = parseInt(document.getElementById("sc2").value || 0);

    if (sc1 >= 100 || sc2 >= 100 || tankChances >= 20) {
        gameOver = true;

        let result;
        if (sc1 > sc2) result = "🎉 Player 1 Wins!";
        else if (sc2 > sc1) result = "🎉 Player 2 Wins!";
        else result = "🤝 It's a Draw!";

        document.getElementById("gameOverText").innerText = result;
        document.getElementById("gameOverPopup").classList.remove("hidden");

        document.getElementById("restartBtn").onclick = () => {
            window.location.reload();
        };

        document.getElementById("exitBtn").onclick = () => {
            window.location.href = "../html/gameover.html";
        };
    }
}



function fireTank(tank, angleDeg, power, shooter, onComplete) {
     
    tankChances++;
    checkGameOver()
    console.log("I am working ")

    const angle = angleDeg * Math.PI / 180;
    let pos = { x: tank.x, y: tank.y };

    let vel;
    if (shooter === "tank1") {
        vel = { x: Math.cos(angle) * power, y: -Math.sin(angle) * power };
    } else {
        vel = { x: -Math.cos(angle) * power, y: -Math.sin(angle) * power };
    }
    const handle = setInterval(() => {
        pos.x += vel.x;
        pos.y += vel.y;
        vel.y += gravity;

        drawEverything();

        context.beginPath();
        context.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        context.fillStyle = "black";
        context.fill();

        const xi = Math.floor(pos.x);
        if (xi < 0 || xi >= canvas.width || pos.y >= (window.terrainHeight[xi] || maxHeight)) {
            clearInterval(handle);
            explode(pos.x, pos.y, 30, shooter);
            if (typeof onComplete === "function") onComplete();
        }
    }, 16);

    return handle;
}





function setupAndDraw() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    maxHeight = canvas.height;

    const mountHeight = maxHeight * 0.5;

    generateMountain(canvas.width, mountHeight);
    drawTerrain(window.terrainHeight);

    const peakIndex = window.terrainHeight.indexOf(Math.min(...window.terrainHeight));

    tank1.x = getRandomTankX(20, Math.max(20, peakIndex - 50));
    tank1.y = getTankY(tank1.x);

    tank2.x = getRandomTankX(Math.min(canvas.width - 20, peakIndex + 50), canvas.width - 20);
    tank2.y = getTankY(tank2.x);

    drawEverything();
}

window.addEventListener("resize", () => {
    setupAndDraw();
});

setupAndDraw();

function drawWhoseTurnItIs() {
    const pointerHeight = 40;
    const pointerWidth = 12;
    const pointerColor = "yellow";

    context.fillStyle = pointerColor;
    context.strokeStyle = "black";
    context.lineWidth = 2;

    let tank = currentTurn === "tank1" ? tank1 : tank2;

    context.beginPath();
    context.moveTo(tank.x, tank.y - pointerHeight);
    context.lineTo(tank.x - pointerWidth / 2, tank.y - pointerHeight + pointerWidth);
    context.lineTo(tank.x + pointerWidth / 2, tank.y - pointerHeight + pointerWidth);
    context.closePath();
    context.fill();
    context.stroke();
}



function drawEverything() {
    drawTerrain(window.terrainHeight);
    drawTanks();
    drawWhoseTurnItIs();
}

fireButton.addEventListener("click", function (e) {
    if (gameOver) return;

    const angleV = parseInt(document.getElementById("angleValue").value);
    const powerV = parseInt(document.getElementById("powerValue").value);
    if (currentTurn === "tank1") {
        fireTank(tank1, angleV, powerV, "tank1", () => {
            currentTurn = "tank2";
            drawEverything();
        });
    } else {
        fireTank(tank2, angleV, powerV, "tank2", () => {
            currentTurn = "tank1";
            drawEverything();
        });
    }
});


