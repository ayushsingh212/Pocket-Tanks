const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

canvas.width = window.innerWidth;   // we are taking the innerwidth of window
canvas.height = window.innerHeight;  // we are taking the innerheight off the window

const maxHeight = canvas.height;   // We are taking here the drawing area width
const tankWidth = 30;          // Specifying the specific width to tank
const tankHeight = 20;        // Specifying the height to tank
const offsetAboveTerrain = 8;    // it will decide how above the tank will be
const gravity = 0.4;          // the value of the gravity inn the projectile motion


function randRange(a,b){ return a + Math.random()*(b-a); }   // i had made this to return a random number between a,b

// it will ensure the v does not go  out of a,b
function limit(v,a,b){ return Math.max(a, Math.min(b,v)); }

 // Deciding where the mountain peak will appear horizontally like in my screen if it is one it will appear between .45 to .75
const peakPosMin = 0.45;
const peakPosMax = 0.75;


// we are generating mountain of certain width and a height
function generateMountain(width, mountHeight) {
    let height = [];   // will be storing the height for every x coordinate
    height[0] = maxHeight;
    height[width-1] = maxHeight;

    function divide(left,right,rough){
        if(right-left <=1) return;  // when the 1 px will be ,it will stop
        let mid = Math.floor((left+right)/2); 
        let avg = (height[left]+height[right])/2;
        let displacement = (Math.random()-0.5)*rough;
        height[mid] = avg + displacement;
        divide(left,mid,rough/1.8);
        divide(mid,right,rough/1.8);
    }

    let peakX = Math.floor(randRange(width*peakPosMin, width*peakPosMax));
    height[peakX] = maxHeight - mountHeight;
    divide(0,peakX,mountHeight/2);
    divide(peakX,width-1,mountHeight/2);

    for(let x=0;x<width;x++){
        height[x] = limit(height[x], maxHeight - mountHeight, maxHeight);
    }

    window.terrainHeight = height; 
    return height;
}

function drawTerrain(height){
    context.clearRect(0,0,canvas.width,canvas.height);
    context.beginPath();
    context.moveTo(0, maxHeight);
    for(let x=0;x<height.length;x++){
        context.lineTo(x, height[x]);
    }
    context.lineTo(canvas.width-1,maxHeight);
    context.closePath();
    context.fillStyle="darkgreen";
    context.fill();
    context.strokeStyle="darkgreen";
    context.stroke();
}

function getRandomTankX(startX, endX){
    return Math.floor(randRange(startX, endX));
}

function getTankY(x){
    return terrainHeight[x] - tankHeight - offsetAboveTerrain;
}

const mountHeight = maxHeight*0.5;
generateMountain(canvas.width, mountHeight);
drawTerrain(terrainHeight);

let peakIndex = terrainHeight.indexOf(Math.min(...terrainHeight));

let tank1 = {x:getRandomTankX(0, peakIndex-50)};
tank1.y = getTankY(tank1.x);
let tank2 = {x:getRandomTankX(peakIndex+50, canvas.width-1)};
tank2.y = getTankY(tank2.x);

function drawTanks(){
    context.fillStyle="blue";
    context.fillRect(tank1.x - tankWidth/2, tank1.y, tankWidth, tankHeight);
    context.fillStyle="red";
    context.fillRect(tank2.x - tankWidth/2, tank2.y, tankWidth, tankHeight);
}

function fireTank(tank, angleDeg, power, callback){
    let angle = angleDeg * Math.PI / 180;
    let pos = {x: tank.x, y: tank.y};
    let vel = {
        x: Math.cos(angle)*power,
        y: -Math.sin(angle)*power
    };

    let projectile = setInterval(()=>{
        pos.x += vel.x;
        pos.y += vel.y;
        vel.y += gravity;

        drawTerrain(terrainHeight);
        drawTanks();

        context.beginPath();
        context.arc(pos.x, pos.y, 5, 0, Math.PI*2);
        context.fillStyle = "black";
        context.fill();

        if(pos.y >= terrainHeight[Math.floor(pos.x)] || pos.x <0 || pos.x >= canvas.width){
            clearInterval(projectile);
            explode(pos.x, pos.y, 30); 
            if(callback) callback();
        }
    }, 16);
}

function explode(x, y, radius){
    for(let i=Math.max(0, Math.floor(x-radius)); i<=Math.min(canvas.width-1, Math.floor(x+radius)); i++){
        let dx = i - x;
        let dy = Math.sqrt(radius*radius - dx*dx);
        terrainHeight[i] = Math.max(terrainHeight[i], y + dy);
    }
    tank1.y = getTankY(tank1.x);
    tank2.y = getTankY(tank2.x);
    drawTerrain(terrainHeight);
    drawTanks();
}

drawTanks();
function fireTankAt(tank, targetX, targetY){
    const dx = targetX - tank.x;
    const dy = tank.y - targetY; 

    const angle = Math.atan2(dy, dx);

    const power = Math.min(Math.sqrt(dx*dx + dy*dy)/10, 15);

    fireTank(tank, angle*180/Math.PI, power);
}


canvas.addEventListener("click", function(e){
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    fireTankAt(tank1, mouseX, mouseY);
});
