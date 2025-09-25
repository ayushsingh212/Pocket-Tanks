const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let maxHeight = 0;
const peakPosMin = 0.25;
const peakPosMax = 0.75;
let mountHeight = 0;
const tankImg = new Image();
tankImg.src = "../styles/tank1.png";


let nameV = document.querySelector(".name");
let playerHp = document.querySelector("#player1-hp");
let computerHp = document.querySelector("#computer-hp");



const playersInfo  = JSON.parse(localStorage.getItem("players")) || [];


let length = playersInfo.length-1;
   
const currentUser  =  playersInfo[length];
nameV.innerText = `${currentUser["name"]}`
playerHp.innerText =`${currentUser["health"]}`
computerHp.innerText = `${currentUser["health"]}`







// Returns a random number between a and b.
function randRange(a, b) {
    return a + Math.random() * (b - a);
}

// Restricts a value v inside range [a, b].
function limit(v, a, b) {
    return Math.max(a, Math.min(b, v));
}

// Mountain height ka array pane ka function
function generateMountainHeight(width, mountHeight) {
    let height = [];
    height[0] = maxHeight;
    // max height isliya liya hai kyunki canvas ka coordinate system inverted work krta hai 
    height[width - 1] = maxHeight;
    function divide(left, right, rough) { //midpoint displacement algo
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
    // Choose a random peak position between 25% and 75% of the canvas width.
    let peakX = Math.floor(randRange(width * peakPosMin, width * peakPosMax));
    height[peakX] = maxHeight - mountHeight;
    divide(0, peakX, mountHeight / 2);
    divide(peakX, width - 1, mountHeight / 2);
    window.peakX = peakX; // global variable banayega jissa baad mai projectile logic mai use kr ske
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
// terrain heights ko global variable bana diya jissa collision detection jaise function per use kr paye
window.terrainHeight = null;

window.getGroundHeightAt = function (x) {
    x = Math.floor(limit(x, 0, canvas.width - 1));
    return (window.terrainHeight && window.terrainHeight[x]) || maxHeight;
};

const tankWidth = 80;
const tankHeight = 50;
const leftTankX = 300;
const rightTankXPadding = 300;
const damageRadius = 30;
const damageAmount = 5;
const maxHealth = currentUser["health"];

const players = {
    player1: {
        x: leftTankX,
        color: "blue",
        health: maxHealth
    },
    computer: {
        x: canvas.width - rightTankXPadding,
        color: "red",
        health: maxHealth,
        angle: Math.PI * 3 / 4
    }
};

// This function calculates the x-coordinate for placing the computer’s tank on the right side of the canvas.
function rightTankX() {
    return canvas.width - rightTankXPadding;
}

function tankCentre(player) {
    const cx = player.x;
    const cy = getGroundHeightAt(player.x) - tankHeight / 2;
    const groundY = getGroundHeightAt(player.x);
    const corrcy = groundY - tankHeight / 2;
    return { 
        x: cx, 
        y: corrcy 
    };
}


function drawTank(x, color) {
    const groundY = getGroundHeightAt(x);

    const cx = x;
    const cy = groundY - tankHeight;

    let img;
    if (color === "blue") {
        img = tankImg;
    } else {
        img = tankImg;
    }
    context.drawImage(img, cx - tankWidth / 2, cy, tankWidth, tankHeight);

    const gunLength = 18;
    let gunAngle;
    if (color === "blue") {
        gunAngle = aimState.currentAngle;
    } else {
        const pl = (color === "red") ? players.computer : null;
        gunAngle = (pl && pl.angle) ? pl.angle : Math.PI * 3 / 4;
    }

    context.beginPath();
    context.moveTo(cx, cy + 12);
    context.lineTo(
        cx + Math.cos(gunAngle) * gunLength,
        cy - Math.sin(gunAngle) * gunLength
    );
    context.lineWidth = 3;
    context.strokeStyle = "yellow";
    context.stroke();
}


// gravity 1000 isliya li hai kyunki frame rate (dt) jo ayega vo mostly three unit places tk ata hai
const gravity = 1000;
// projectiles keeps track of all active projectiles currently in the game jissa hum unha update aur render 
// easily krwade
const projectiles = [];
class Projectile {
    constructor(x, y, vx, vy, color, r, firedBy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.r = r;
        this.color = color; // projectile color
        this.alive = true; // projectile abhi bhi udh rha hai kya
        this.hit = false;
        this.hitX = 0;
        this.hitY = 0;
        this.startX = x; // initial horizontal position where the projectile was fired
        this.crossPeak = false;
        this.firedBy = firedBy; 
          this.explosionFrame = 0;
        this.trail = [];
    }

    update(dt) {
        if (!this.alive) {
            return;
        }
        // v = u + gt and dist = speed x time
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

        // tank ke sath collision detection
        for (let key in players) {
            const player = players[key];
           if (this.tankHit(this.x, this.y, player)) {
    this.alive = false;
    this.hitX = this.x;
    this.hitY = this.y;
    
    this.crater(Math.floor(this.x), 18);
    player.health = Math.max(0, player.health - damageAmount);
    updateHud();
    checkGameOver();
    return;
}
        }

        // Collision with terrain
     if (this.y + this.r >= groundY) {
    this.alive = false;
    this.hitX = this.x;
    this.hitY = groundY;
    this.hit = true;

    this.crater(Math.floor(this.x), 25); // terrain destruction
    this.damageAt(this.x, this.y); // damage tanks in radius
}

        //Out of bounds mai projectile bekar ho jayega
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
         handleTankCollision(player) {
                this.alive = false;
                this.hitX = this.x;
                this.hitY = this.y;
                this.hit = true;
                this.explosionFrame = 0;

                player.health = Math.max(0, player.health - damageAmount);
                
                const xi = Math.floor(this.x);
                this.crater(xi, 20);
                
                updateHud();
                checkGameOver();
            }
      handleTerrainCollision(xi, groundY) {
                this.alive = false;
                this.hitX = this.x;
                this.hitY = groundY;
                this.hit = true;
                this.explosionFrame = 0;
                
                this.crater(Math.floor(this.x), 25);
                this.damageAt(this.x, this.y);
            }
  damageAt(cx, cy) {
                for (let key in players) {
                    const p = players[key];
                    const center = tankCentre(p);
                    const d = Math.hypot(cx - center.x, cy - center.y);
                    if (d <= damageRadius) {
                        p.health = Math.max(0, p.health - damageAmount);
                    }
                }
                updateHud();
                checkGameOver();
            }

  crater(centerX, radius) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(canvas.width - 1, centerX + radius); x++) {
        const dx = x - centerX;
        if (Math.abs(dx) > radius) continue;
        const h = window.terrainHeight[x];
        const dy = Math.sqrt(radius*radius - dx*dx);
        window.terrainHeight[x] = Math.min(maxHeight, h + dy);
    }
}


            smoothCrater(centerX, radius) {
                const smoothRadius = radius + 10;
                const start = Math.max(0, centerX - smoothRadius);
                const end = Math.min(canvas.width - 1, centerX + smoothRadius);
                
                for (let x = start; x <= end; x++) {
                    if (x > 1 && x < window.terrainHeight.length - 2) {
                        // 5-point smoothing for better results
                        const avg = (
                            window.terrainHeight[x-2] + 
                            window.terrainHeight[x-1] + 
                            window.terrainHeight[x] + 
                            window.terrainHeight[x+1] + 
                            window.terrainHeight[x+2]
                        ) / 5;
                        window.terrainHeight[x] = avg;
                    }
                }
            }

    // Draws the projectile as a circle aur jb hit hoga to circle formation hoga show krne ko
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
          drawExplosion(ctx) {
    if (!this.hit && this.explosionFrame === 0) return;

    const frames = 15;
    const progress = this.explosionFrame / frames;
    const alpha = Math.max(0, 1 - progress);
    const radius = 15 + this.explosionFrame * 3;

    ctx.beginPath();
    ctx.arc(this.hitX, this.hitY, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.hitX, this.hitY, radius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 0, ${alpha * 0.8})`;
    ctx.fill();

    this.explosionFrame++;
    if (this.explosionFrame > frames) {
        this.hit = false;
        this.explosionFrame = 0;
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

//aiming line dikhana ke liya use hota hai jb user power and angle sliders ka use karega
function updateAimAssistFromAngle() {
    updateAimCircle();
    const a = aimState.currentAngle;
    const c = aimState.shootCircle;
    const dist = aimState.currentPower * 0.5;
    aimState.mousePos = {
        // polar coordinates are being used as rcos and rsin
        x: c.x + Math.cos(a) * dist, 
        y: c.y - Math.sin(a) * dist
    };
    aimState.controlAiming = true; // Marks that the aiming is currently controlled by the sliders
}
  
let deg =45;
angleRange.addEventListener("input", (e) => {
    deg = Number(e.target.value);
    angleValue.innerText = deg;
    aimState.currentAngle = deg * Math.PI / 180;
    updateAimAssistFromAngle();
});

let p = 5;
powerRange.addEventListener("input", (e) => {
    p = Number(e.target.value);
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

// space button se bhi fire hoga ab for butter user experience
document.addEventListener("keydown",(e)=>{
    if(e.key === " ")
    {
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
    }
    if (e.key==="ArrowLeft")
    {   
        if(deg === 0)
        {
            return;
        }
        deg = parseInt(deg)
        deg -= 1;
        angleRange.value = deg;
        angleValue.innerText = parseInt(deg);
        aimState.currentAngle = deg * Math.PI / 180;
        updateAimAssistFromAngle();
    }
    if(e.key==="ArrowRight")
    {
        if(deg === 180)
        {
            return;
        }
        deg = parseInt(deg)
        deg += 1;
        angleRange.value = deg;
        angleValue.innerText = parseInt(deg);
        aimState.currentAngle = deg * Math.PI / 180;
        updateAimAssistFromAngle();
    }
    if(e.key ==="ArrowUp")
    {
        if(p === 20)
        {
            return;
        }
        p += 0.25;
        powerRange.value = parseInt(p);
        powerValue.innerText = Math.round(p * 10) / 10;
        aimState.currentPower = p;
        updateAimAssistFromAngle();
    }
    if(e.key ==="ArrowDown")
    {
        if(p ===0)
        {
            return;
        }
        p -= 0.25;
        powerRange.value = parseInt(p);
        powerValue.innerText = Math.round(p * 10) / 10;
        aimState.currentPower = p;
        updateAimAssistFromAngle();
    }
})   // sabhi event listener add hogye yha pe

// tank position ko follow krta hai jb bhi terrain change hoti hai
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

//jb bhi hum blue tank ka pss move kr rha hai jiski vajah se kuch kuch hora hai 
// vo sb iss function ke wajah se hori hai
let mouseDown = false;
canvas.addEventListener("mousemove", (e) => {
    aimState.mousePos = getMousePos(e);
    if (aimState.isAiming) {
        const aim = aimState.shootCircle;
        // difference between the shoot circle center and the current mouse position.
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

// starts the aiming process when the player clicks inside the circle.
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
        
        console.log("I am working")

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

// computer iski vajah se shoot karega
function computerTurn() {
    const computer = players.computer;
    const player = players.player1;
    const targetOffset = randRange(-20, 20);
    const targetX = player.x + targetOffset;
    const targetY = getGroundHeightAt(player.x);
    let bestAngle = 0;
    let bestPower = 0;
    let minError = Infinity;
    for (let angleRad = Math.PI / 6; angleRad <= Math.PI * 5 / 6; angleRad += Math.PI / 36) {
        for (let power = 5; power <= 25; power += 0.5) {
            const speed = power * 70;
            const vx = Math.cos(angleRad) * speed;
            const vy = -Math.sin(angleRad) * speed;
            let t;
            if (vx === 0) {
                t = 0;
            }
            else {
                t = (targetX - computer.x) / vx;
            }
            const yEst = getGroundHeightAt(computer.x) - tankHeight - Math.sin(angleRad) * (tankWidth / 2) + vy * t + 0.5 * gravity * t * t;
            const error = Math.abs(yEst - targetY);
            if (error < minError) {
                minError = error;
                bestAngle = angleRad;
                bestPower = power;
            }
        }
    }
    players.computer.angle = bestAngle;
    const startX = computer.x + Math.cos(bestAngle) * (tankWidth / 2);
    const startY = getGroundHeightAt(computer.x) - tankHeight - Math.sin(bestAngle) * (tankWidth / 2);
    fireProjectile(startX, startY, bestAngle, bestPower, "computer");
    currentPlayer = "player1";
}



function update(dt) {
    updateAimCircle();

    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update(dt); // ye main line hai jo move krva rhi hai
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
    if (aimState.isAiming || mouseDown) {// aim assist line draw krne ke liya
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

//dt jo hum upar baar baar use kr rhe hai vo frame rate ke logic pai work kr rha hai
function loop(now) {
    const dt = (now - lastTime) / 1000; 
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
    let results;
    if (players.player1.health <= 0) {
        gameOver = true;
         results = "Computer Wins!"
            document.getElementById("gameOverText").innerText = results;
        document.getElementById("gameOverPopup").classList.remove("hidden");

        document.getElementById("restartBtn").onclick = () => {
            window.location.reload();
        };

        document.getElementById("exitBtn").onclick = () => {
            window.location.href = "../html/gameover.html";
        };
        return true;
    }
    if (players.computer.health <= 0) {
        gameOver = true;
         results = "Player 1 Wins!"
            document.getElementById("gameOverText").innerText = results;
        document.getElementById("gameOverPopup").classList.remove("hidden");

        document.getElementById("restartBtn").onclick = () => {
            window.location.reload();
        };

        document.getElementById("exitBtn").onclick = () => {
            window.location.href = "../html/gameover.html";
        };
        return true;
    }
  
    return false;
}
