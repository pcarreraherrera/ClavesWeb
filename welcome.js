const nameEl = document.getElementById("user-name");
const emailEl = document.getElementById("user-email");
const backBtn = document.getElementById("back-login");

const storedName = sessionStorage.getItem("userFullName");
const storedEmail = sessionStorage.getItem("userEmail");
const fullName = storedName || storedEmail;

if (!fullName) {
  window.location.href = "index.html";
} else {
  nameEl.textContent = fullName;
  emailEl.textContent = storedEmail || ""; // muestra email si existe, evitando duplicar nombre
}

backBtn.addEventListener("click", () => {
  sessionStorage.removeItem("userFullName");
  sessionStorage.removeItem("userEmail");
  window.location.href = "index.html";
});
