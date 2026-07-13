// ==========================================
// NOTY - AUTENTICACIÓN Y EXPERIENCIA DE ACCESO
// ==========================================

const loginForm = document.querySelector("#loginForm");
const registerForm = document.querySelector("#registerForm");
const messageElement = document.querySelector("#message");

const forgotPasswordButton = document.querySelector(
  "#forgotPasswordButton"
);

const forgotPasswordModal = document.querySelector(
  "#forgotPasswordModal"
);

// ==========================================
// MENSAJES
// ==========================================

function showMessage(text, type = "info") {
  if (!messageElement) {
    return;
  }

  messageElement.textContent = text;
  messageElement.className = `message ${type}`;
}

// ==========================================
// MODAL DE RECUPERACIÓN
// ==========================================

function openModal(modal) {
  if (!modal) {
    return;
  }

  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) {
    return;
  }

  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

if (forgotPasswordButton && forgotPasswordModal) {
  forgotPasswordButton.addEventListener("click", () => {
    openModal(forgotPasswordModal);
  });
}

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-modal]");

  if (closeButton) {
    const modalId = closeButton.dataset.closeModal;
    const modal = document.querySelector(`#${modalId}`);

    closeModal(modal);
  }

  if (
    event.target.classList.contains("modal-overlay") &&
    !event.target.hidden
  ) {
    closeModal(event.target);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  document
    .querySelectorAll(".modal-overlay:not([hidden])")
    .forEach((modal) => closeModal(modal));
});

// ==========================================
// INICIO DE SESIÓN
// ==========================================

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = loginForm.querySelector(
      'button[type="submit"]'
    );

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      showMessage(
        "Completa el correo electrónico y la contraseña.",
        "error"
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Ingresando...";

    showMessage("Validando tus datos...", "info");

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      });

      saveToken(data.token);
      saveUser(data.user);

      showMessage(
        "Inicio de sesión exitoso. Abriendo tus notas...",
        "success"
      );

      window.setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (error) {
      showMessage(error.message, "error");
      submitButton.disabled = false;
      submitButton.textContent = "Entrar a Noty";
    }
  });
}

// ==========================================
// REGISTRO DE USUARIO
// ==========================================

if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = registerForm.querySelector(
      'button[type="submit"]'
    );

    const formData = new FormData(registerForm);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    if (!name || !email || !password) {
      showMessage(
        "Completa todos los campos para crear tu cuenta.",
        "error"
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Creando cuenta...";

    showMessage("Creando tu cuenta...", "info");

    try {
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password
        })
      });

      showMessage(
        "Cuenta creada correctamente. Te llevaremos al inicio de sesión.",
        "success"
      );

      window.setTimeout(() => {
        window.location.href = "login.html";
      }, 1000);
    } catch (error) {
      showMessage(error.message, "error");
      submitButton.disabled = false;
      submitButton.textContent = "Crear cuenta";
    }
  });
}