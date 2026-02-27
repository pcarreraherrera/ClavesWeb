const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit");
const toggleBtn = document.getElementById("toggle-password");
const statusBox = document.getElementById("status");

const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");

const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i;
// Ajusta la ruta/puerto a tu backend local
const ENDPOINT = "http://localhost:3000/login";

const state = {
  emailValid: false,
  passwordValid: false,
  submitting: false,
};

function setError(field, message) {
  if (field === "email") emailError.textContent = message;
  if (field === "password") passwordError.textContent = message;
}

function clearErrors() {
  emailError.textContent = "";
  passwordError.textContent = "";
}

function validateEmail() {
  const value = emailInput.value.trim();
  if (!value) {
    setError("email", "Ingresa tu correo.");
    state.emailValid = false;
    return;
  }
  if (!EMAIL_REGEX.test(value)) {
    setError("email", "Formato de correo inválido.");
    state.emailValid = false;
    return;
  }
  setError("email", "");
  state.emailValid = true;
}

function validatePassword() {
  const value = passwordInput.value.trim();
  if (!value) {
    setError("password", "Ingresa tu contraseña.");
    state.passwordValid = false;
    return;
  }
  if (value.length < 6) {
    setError("password", "Mínimo 6 caracteres.");
    state.passwordValid = false;
    return;
  }
  setError("password", "");
  state.passwordValid = true;
}

function updateSubmitState() {
  const enabled = state.emailValid && state.passwordValid && !state.submitting;
  submitBtn.disabled = !enabled;
}

function showStatus(message, variant) {
  statusBox.textContent = message;
  statusBox.classList.remove("success", "error", "show");
  if (variant) statusBox.classList.add(variant);
  requestAnimationFrame(() => statusBox.classList.add("show"));
}

function togglePassword() {
  const isText = passwordInput.type === "text";
  passwordInput.type = isText ? "password" : "text";
  toggleBtn.classList.toggle("active", !isText);
}

toggleBtn.addEventListener("click", togglePassword);

emailInput.addEventListener("input", () => {
  validateEmail();
  updateSubmitState();
});

passwordInput.addEventListener("input", () => {
  validatePassword();
  updateSubmitState();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  validateEmail();
  validatePassword();
  updateSubmitState();
  if (!state.emailValid || !state.passwordValid) return;

  state.submitting = true;
  updateSubmitState();
  showStatus("Validando credenciales...", "");

  try {
    // Llamada base al backend local; ajusta método/ruta según tu API
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailInput.value.trim(), password: passwordInput.value }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || data.error || "Error al iniciar sesión");

    showStatus(data.message || "Acceso concedido. Redirigiendo...", "success");
    form.classList.add("success-animation");
  } catch (error) {
    console.error(error);
    showStatus(error.message || "No pudimos iniciar sesión.", "error");
  } finally {
    state.submitting = false;
    updateSubmitState();
  }
});

// Opcional: manejar click de registro
const registerBtn = document.getElementById("register");
registerBtn.addEventListener("click", () => {
  showStatus("Funcionalidad de registro pendiente.", "");
});

// Inicio suave en caso de rehidratación lenta
window.addEventListener("DOMContentLoaded", () => {
  clearErrors();
  updateSubmitState();
});
