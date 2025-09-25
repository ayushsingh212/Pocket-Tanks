const playerNameInput = document.getElementById("player1_name");
const playerHealthInput = document.getElementById("playerHealthValue");
const healthDisplay = document.querySelector("#healthV");
const saveButton = document.getElementById("saveData");

playerHealthInput.addEventListener("input", () => {
   
  healthDisplay.innerText = ` ${playerHealthInput.value}`;
});

saveButton.addEventListener("click", () => {
  const playerName = playerNameInput.value.trim();
  const playerHealth = playerHealthInput.value;

  if (!playerName) {
    return;
  }

  const storedPlayers = JSON.parse(localStorage.getItem("players")) || [];
  const updatedPlayers = storedPlayers.filter(p => p.name !== playerName);

  updatedPlayers.push({
    name: playerName,

    health: playerHealth,
    opponent: "computer"
  });

  localStorage.setItem("players", JSON.stringify(updatedPlayers));

  saveButton.innerText = `Saved`
});
