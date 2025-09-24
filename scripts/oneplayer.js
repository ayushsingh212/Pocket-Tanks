const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let maxHeight = 0;
const peakPosMin = 0.25;
const peakPosMax = 0.75;
let mountHeight = 0;

function randRange(a, b) {
    return a + Math.random() * (b - a);
}

function limit(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

function generateMountainHeight(width, mountHeight) {
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
    window.peakX = peakX;
    return height;
}

function mountainGenerate(heightArr, fillStyle, strokeStyle) {
    context.beginPath();
    context.moveTo(0, maxHeight);
    for (let x = 0; x < heightArr.length; x++) {
        context.lineTo(x, heightArr[x]);
    }
    context.lineTo(heightArr.length - 1, maxHeight);
    context.closePath();
    context.fillStyle = fillStyle;
    context.fill();
    context.strokeStyle = strokeStyle;
    context.stroke();
}
window.terrainHeight = null;

window.getGroundHeightAt = function (x) {
    x = Math.floor(limit(x, 0, canvas.width - 1));
    return (window.terrainHeight && window.terrainHeight[x]) || maxHeight;
};

const tankWidth = 30;
const tankHeight = 15;
const leftTankX = 300;
const rightTankXPadding = 300;
const damageRadius = 30;
const damageAmount = 5;
const maxHealth = 5;

const players = {
    player1: {
        x: leftTankX,
        color: "blue",
        health: maxHealth
    },
    computer: {
        x: canvas.width - rightTankXPadding,
        color: "red",
        health: maxHealth
    }
};

function rightTankX() {
    return canvas.width - rightTankXPadding;
}

function tankCentre(player) {
    const cx = player.x;
    const cy = getGroundHeightAt(player.x) - tankHeight / 2;
    return {
        x: cx,
        y: cy
    };
}

function drawTank(x, color) {
    const groundY = getGroundHeightAt(x);
    context.fillStyle = color;
    context.fillRect(x - tankWidth / 2, groundY - tankHeight, tankWidth, tankHeight);
    const gunLength = 18;
    let gunAngle = Math.PI * 3 / 4;
    if (color == "blue") {
        gunAngle = aimState.currentAngle;
    }
    const cx = x;
    const cy = groundY - tankHeight;
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx + Math.cos(gunAngle) * gunLength, cy - Math.sin(gunAngle) * gunLength);
    context.lineWidth = 3;
    context.strokeStyle = "yellow";
    context.stroke();
}

const gravity = 1000;
const projectiles = [];
class Projectile {
    constructor(x, y, vx, vy, color = "black", r = 5, firedBy = "player1") {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.r = r;
        this.color = color;
        this.alive = true;
        this.hit = false;
        this.hitX = 0;
        this.hitY = 0;
        this.startX = x;
        this.crossPeak = false;
        this.firedBy = firedBy; 
    }

    update(dt) {
        if (!this.alive) {
            return;
        }
        this.vy += gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (!this.crossPeak) {
            if ((this.startX < window.peakX && this.x >= window.peakX) || (this.startX > window.peakX && this.x <= window.peakX) || Math.floor(this.x) == window.peakX) {
                this.crossPeak = true;
            }
        }

        const xi = Math.floor(limit(this.x, 0, canvas.width - 1));
        const groundY = getGroundHeightAt(xi);

        const craterForm = () => {
            if (this.firedBy == "computer") {
                return true;
            }
            if (this.crossPeak || xi == window.peakX) {
                return true;
            }
            return false;
        };

        for (let key in players) {
            const player = players[key];
            if (this.tankHit(this.x, this.y, player)) {
                const willCrater = craterForm();
                this.alive = false;
                this.hitX = this.x;
                this.hitY = this.y;

                if (willCrater) {
                    this.hit = true;
                    this.crater(xi, 18);
                    this.damageAt(this.x, this.y);
                } else {
                    this.hit = false;
                }
                return;
            }
        }
        if (this.y + this.r >= groundY) {
            const willCrater = craterForm();
            this.alive = false;
            this.hitX = this.x;
            this.hitY = groundY;

            if (willCrater) {
                this.hit = true;
                this.crater(xi, 18);
                this.damageAt(this.x, groundY);
            } else {
                this.hit = false;
            }
        }
        if (this.x < -50 || this.x > canvas.width + 50 || this.y > canvas.height + 50) {
            this.alive = false;
            this.hit = false;
        }
    }

    tankHit(projX, projY, tank) {
        const tankTop = getGroundHeightAt(tank.x) - tankHeight;
        const tankLeft = tank.x - tankWidth / 2;
        const tankRight = tank.x + tankWidth / 2;
        const tankBottom = tankTop + tankHeight;
        return projX >= tankLeft && projX <= tankRight && projY >= tankTop && projY <= tankBottom;
    }

    damageAt(cx, cy) {
        for (let key in players) {
            const p = players[key];
            const center = tankCentre(p);
            if (Math.hypot(cx - center.x, cy - center.y) <= damageRadius) {
                p.health = Math.max(0, p.health - damageAmount);
            }
        }
        updateHud();
        checkGameOver();
    }

    crater(centerX, radius) {
        const start = Math.max(0, centerX - radius);
        const end = Math.min(canvas.width - 1, centerX + radius);
        for (let i = start; i <= end; i++) {
            const dist = Math.abs(i - centerX);
            let t = dist / radius;
            t = Math.max(0, Math.min(1, t));
            const factor = 1 - (t * t * t);
            const lowerBy = factor * 15;
            window.terrainHeight[i] = Math.min(maxHeight, window.terrainHeight[i] + lowerBy);
        }
    }

    draw(ctx) {
        if (!this.alive && !this.hit) {
            return;
        }
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        if (this.hit) {
            ctx.beginPath();
            ctx.arc(this.hitX, this.hitY - 5, 16, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,140,0,0.6)";
            ctx.fill();
            this.hit = false;
        }
    }
}

function fireProjectile(startX, startY, angleRad, power, shooter) {
    const speed = power * 70;
    const vx = Math.cos(angleRad) * speed;
    const vy = -Math.sin(angleRad) * speed;
    const p = new Projectile(startX, startY, vx, vy, "cyan", 5, shooter);
    projectiles.push(p);
}

const aimState = {
    isAiming: false,
    currentAngle: Math.PI / 4,
    currentPower: 5,
    maxPower: 20,
    shootCircle: {
        x: leftTankX,
        y: 0,
        r: 300
    },
    mousePos: null
};

aimState.controlAiming = false;

const angleRange = document.getElementById("angleRange");
const powerRange = document.getElementById("powerRange");
const angleValue = document.getElementById("angleValue");
const powerValue = document.getElementById("powerValue");
const fireButton = document.getElementById("fireButton");

angleRange.value = Math.round((aimState.currentAngle * 180) / Math.PI);
angleValue.innerText = angleRange.value;
powerRange.value = aimState.currentPower;
powerValue.innerText = Math.round(aimState.currentPower * 10) / 10;

function updateAimAssistFromAngle() {
    updateAimCircle();
    const a = aimState.currentAngle;
    const c = aimState.shootCircle;
    const dist = aimState.currentPower * 0.5;
    aimState.mousePos = {
        x: c.x + Math.cos(a) * dist,
        y: c.y - Math.sin(a) * dist
    };
    aimState.controlAiming = true;
}

angleRange.addEventListener("input", (e) => {
    const deg = Number(e.target.value);
    angleValue.innerText = deg;
    aimState.currentAngle = deg * Math.PI / 180;
    updateAimAssistFromAngle();
});

powerRange.addEventListener("input", (e) => {
    const p = Number(e.target.value);
    powerValue.innerText = Math.round(p * 10) / 10;
    aimState.currentPower = p;
    updateAimAssistFromAngle();
});

fireButton.addEventListener("click", () => {
    if (currentPlayer !== "player1") {
        return;
    }
    updateAimCircle();
    const startX = leftTankX + Math.cos(aimState.currentAngle) * (tankWidth / 2);
    const startY = getGroundHeightAt(leftTankX) - tankHeight - Math.sin(aimState.currentAngle) * (tankWidth / 2);
    fireProjectile(startX, startY, aimState.currentAngle, aimState.currentPower, "player1");
    aimState.controlAiming = false;
    aimState.mousePos = null;
    currentPlayer = "computer";
});

function updateAimCircle() {
    const groundY = getGroundHeightAt(leftTankX);
    aimState.shootCircle.y = groundY - tankHeight;
    aimState.shootCircle.x = leftTankX;
}

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

let mouseDown = false;
canvas.addEventListener("mousemove", (e) => {
    aimState.mousePos = getMousePos(e);
    if (aimState.isAiming) {
        const aim = aimState.shootCircle;
        const dx = aimState.mousePos.x - aim.x;
        const dy = aimState.mousePos.y - aim.y;
        const angle = Math.atan2(-dy, dx);
        aimState.currentAngle = angle;
        const distance = Math.min(dist(aim, aimState.mousePos), aim.r);
        aimState.currentPower = (distance / aim.r) * aimState.maxPower;
        angleRange.value = Math.round((angle * 180) / Math.PI);
        angleValue.innerText = angleRange.value;
        powerRange.value = aimState.currentPower;
        powerValue.innerText = Math.round(aimState.currentPower * 10) / 10;
    }
});

canvas.addEventListener("mousedown", (e) => {
    const pos = getMousePos(e);
    updateAimCircle();
    if (dist(pos, aimState.shootCircle) <= aimState.shootCircle.r) {
        aimState.isAiming = true;
        mouseDown = true;
    }
});

canvas.addEventListener("mouseup", (e) => {
    if (aimState.isAiming) {
        const aim = aimState.shootCircle;
        const dx = aimState.mousePos.x - aim.x;
        const dy = aimState.mousePos.y - aim.y;
        const angle = Math.atan2(-dy, dx);
        aimState.currentAngle = angle;
        const length = Math.min(dist(aim, aimState.mousePos), aim.r);
        aimState.mousePos = {
            x: aim.x + Math.cos(angle) * length,
            y: aim.y - Math.sin(angle) * length
        };
    }
    aimState.isAiming = false;
    mouseDown = false;
});

function regenerateTerrain() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    maxHeight = canvas.height;
    const canvaRatio = 0.75;
    mountHeight = canvas.height * canvaRatio * 0.9;
    const h = generateMountainHeight(canvas.width, mountHeight);
    window.terrainHeight = h;
    players.computer.x = rightTankX();
    players.player1.x = leftTankX;
    updateHud();
    currentPlayer = "player1";
}

window.addEventListener("resize", () => {
    regenerateTerrain();
});
regenerateTerrain();

let lastTime = 0;

function computerTurn() {
    const computer = players.computer;
    const player = players.player1;
    const targetOffset = randRange(-5, 5);
    const targetX = player.x + targetOffset;
    const targetY = getGroundHeightAt(player.x);
    const dx = targetX - computer.x;
    const angleRad = Math.PI * 3 / 4;
    let bestPower = 0;
    let minError = Infinity;
    for (let power = 5; power <= 20; power += 0.5) {
        const speed = power * 70;
        const vx = Math.cos(angleRad) * speed;
        const vy = -Math.sin(angleRad) * speed;
        let t;
        if (vx == 0) { 
            t = 0;
        }
        else {
            t = dx / vx;
        }
        const yest = getGroundHeightAt(computer.x) - tankHeight - Math.sin(angleRad) * (tankWidth / 2) + vy * t + 0.5 * gravity * t * t;
        const error = Math.abs(yest - targetY);
        if (error < minError) {
            minError = error;
            bestPower = power;
        }
    }
    const startX = computer.x - Math.cos(angleRad) * (tankWidth / 2);
    const startY = getGroundHeightAt(computer.x) - tankHeight - Math.sin(angleRad) * (tankWidth / 2);
    fireProjectile(startX, startY, angleRad, bestPower, "computer");
    currentPlayer = "player1";
}


function update(dt) {
    updateAimCircle();

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update(dt);
        if (!projectiles[i].alive && !projectiles[i].hit) {
            projectiles.splice(i, 1);
        }
    }
    if (projectiles.length == 0) {
        if (currentPlayer == "computer") {
            computerTurn();
        }
    }
}

function render() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    mountainGenerate(window.terrainHeight, "#0a2a6c", "#1e3c96");
    drawTank(players.player1.x, players.player1.color);
    drawTank(players.computer.x, players.computer.color);
    if (aimState.isAiming || mouseDown) {
        if (aimState.mousePos) {
            const c = aimState.shootCircle;
            const dx = aimState.mousePos.x - c.x;
            const dy = aimState.mousePos.y - c.y;
            const distMouse = Math.hypot(dx, dy);
            const maxDist = Math.min(distMouse, aimState.shootCircle.r);
            const endX = c.x + (dx / distMouse) * maxDist;
            const endY = c.y + (dy / distMouse) * maxDist;
            context.beginPath();
            context.moveTo(c.x, c.y);
            context.lineTo(endX, endY);
            context.lineWidth = 2;
            context.strokeStyle = "rgba(60, 147, 36, 0.8)";
            context.stroke();
        }
    }
    for (let p of projectiles) {
        p.draw(context);
    }
    updateHud();
}

function loop(now) {
    const dt = Math.min(0.05, (now - lastTime) / 1000); 
    update(dt);
    render();
    lastTime = now;
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

function updateHud() {
    const p1 = document.getElementById("player1-hp");
    const comp = document.getElementById("computer-hp");
    if (p1) {
        p1.innerText = players.player1.health + " / " + maxHealth;
    }
    if (comp) {
        comp.innerText = players.computer.health + " / " + maxHealth;
    }
}
updateHud();

let gameOver = false;
function checkGameOver() {
    if (gameOver) {
        return false; 
    }
    if (players.player1.health <= 0) {
        gameOver = true;
        alert("Computer Wins!");
        location.reload(); 
        return true;
    }
    if (players.computer.health <= 0) {
        gameOver = true;
        alert("Player 1 Wins!");
        location.reload();
        return true;
    }
    return false;
}
