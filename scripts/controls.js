const powerSlider = document.getElementById("powerHandle");
const powerValue = document.getElementById("powerValue");

const angleSlider = document.getElementById("angleHandle");
const angleValue = document.getElementById("angleValue");

powerValue.value = powerSlider.value;
angleValue.value = angleSlider.value;















powerSlider.addEventListener("input", () => powerValue.value = powerSlider.value);
angleSlider.addEventListener("input", () => angleValue.value = angleSlider.value);
