const powerBar = document.getElementById("powerBar");
const powerHandle = document.getElementById("powerHandle");
const powerValue = document.getElementById("powerValue");

let isDraggingPower = false;
let power = 50; 

const angleBar = document.getElementById("angleBar");
const angleHandle = document.getElementById("angleHandle");
const angleValue = document.getElementById("angleValue");

let isDraggingAngle = false;
let angle = 45; 

powerHandle.addEventListener("mousedown", () => {
  isDraggingPower = true;
});

document.addEventListener("mouseup", () => {
  isDraggingPower = false;
});

document.addEventListener("mousemove", (e) => {
  if (!isDraggingPower) return;

  const rect = powerBar.getBoundingClientRect();
  let x = e.clientX - rect.left;

  x = Math.max(0, Math.min(x, rect.width));

  powerHandle.style.left = `${x - powerHandle.offsetWidth / 2}px`;

  power = Math.round((x / rect.width) * 100);
  powerValue.value = power;
});

angleHandle.addEventListener("mousedown", () => {
  isDraggingAngle = true;
});

document.addEventListener("mouseup", () => {
  isDraggingAngle = false;
});

document.addEventListener("mousemove", (e) => {
  if (!isDraggingAngle) return;

  const rect = angleBar.getBoundingClientRect();
  let x = e.clientX - rect.left;

  x = Math.max(0, Math.min(x, rect.width));

  angleHandle.style.left = `${x - angleHandle.offsetWidth / 2}px`;

  angle = Math.round((x / rect.width) * 90);
  angleValue.value = angle ;
});


