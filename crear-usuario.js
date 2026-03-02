const form = document.getElementById("create-form");
const statusBox = document.getElementById("status");
const backBtn = document.getElementById("back-login");
const submitBtn = document.getElementById("submit");

const fields = {
  nombre: document.getElementById("nombre"),
  apellido: document.getElementById("apellido"),
  usuario: document.getElementById("usuario"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  departamento: document.getElementById("departamento"),
  cargo: document.getElementById("cargo"),
};

const toggleBtn = document.getElementById("toggle-password");

const errors = {
  nombre: document.getElementById("nombre-error"),
  apellido: document.getElementById("apellido-error"),
  usuario: document.getElementById("usuario-error"),
  email: document.getElementById("email-error"),
  password: document.getElementById("password-error"),
  departamento: document.getElementById("departamento-error"),
  cargo: document.getElementById("cargo-error"),
};

const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,}$/i;
const ENDPOINT = "http://localhost:3000/usuarios";

function setError(key, message) {
  if (errors[key]) errors[key].textContent = message || "";
}

function validate() {
  let ok = true;
  Object.keys(fields).forEach((key) => {
    const value = fields[key].value.trim();
    if (!value) {
      setError(key, "Requerido");
      ok = false;
    } else {
      setError(key, "");
    }
  });

  if (fields.email.value && !EMAIL_REGEX.test(fields.email.value.trim())) {
    setError("email", "Email inválido");
    ok = false;
  }

  if (fields.password.value && fields.password.value.length < 6) {
    setError("password", "Mínimo 6 caracteres");
    ok = false;
  }

  submitBtn.disabled = !ok;
  return ok;
}

Object.values(fields).forEach((input) => {
  input.addEventListener("input", validate);
});

if (toggleBtn) {
  toggleBtn.addEventListener("click", () => {
    const isText = fields.password.type === "text";
    fields.password.type = isText ? "password" : "text";
    toggleBtn.classList.toggle("active", !isText);
  });
}

function showStatus(message, variant) {
  statusBox.textContent = message;
  statusBox.classList.remove("success", "error", "show");
  if (variant) statusBox.classList.add(variant);
  requestAnimationFrame(() => statusBox.classList.add("show"));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validate()) return;
  submitBtn.disabled = true;
  showStatus("Guardando usuario...", "");
  try {
    const payload = {
      nombre: fields.nombre.value.trim(),
      apellido: fields.apellido.value.trim(),
      usuario: fields.usuario.value.trim(),
      email: fields.email.value.trim(),
      password: fields.password.value,
      departamento: fields.departamento.value.trim(),
      cargo: fields.cargo.value.trim(),
    };

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || data.message || "Error al crear usuario");

    showStatus(data.message || "Usuario creado", "success");
    form.reset();
    submitBtn.disabled = true;
    setTimeout(() => (window.location.href = "index.html"), 600);
  } catch (err) {
    console.error(err);
    showStatus(err.message || "No se pudo crear", "error");
    submitBtn.disabled = false;
  }
});

backBtn.addEventListener("click", () => {
  window.location.href = "index.html";
});

validate();
