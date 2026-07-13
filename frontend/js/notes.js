// ==========================================
// NOTY - DASHBOARD, UX Y CRUD DE NOTAS
// ==========================================

const API_BASE_URL =
  window.location.port === "3000"
    ? "/api"
    : "http://localhost:3000/api";

// Elementos principales
const notesList = document.querySelector("#notesList");
const notesSearch = document.querySelector("#notesSearch");
const noteTitle = document.querySelector("#noteTitle");
const noteEditor = document.querySelector("#noteEditor");
const messageElement = document.querySelector("#message");
const saveStatus = document.querySelector("#saveStatus");

const newNoteButton = document.querySelector("#newNoteButton");
const saveNoteButton = document.querySelector("#saveNoteButton");
const deleteNoteButton = document.querySelector("#deleteNoteButton");
const exportPdfButton = document.querySelector("#exportPdfButton");
const logoutButton = document.querySelector("#logoutButton");
const toolbar = document.querySelector(".toolbar");

// Modales
const newNoteModal = document.querySelector("#newNoteModal");
const newNoteForm = document.querySelector("#newNoteForm");
const newNoteTitle = document.querySelector("#newNoteTitle");

const deleteNoteModal = document.querySelector("#deleteNoteModal");
const deleteNoteName = document.querySelector("#deleteNoteName");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");

// Estado
let notes = [];
let selectedNoteId = null;
let hasUnsavedChanges = false;

// ==========================================
// AUTENTICACIÓN Y API
// ==========================================

function getToken() {
  return localStorage.getItem("noty_token");
}

function removeToken() {
  localStorage.removeItem("noty_token");
  localStorage.removeItem("noty_user");
}

function protectDashboard() {
  if (!getToken()) {
    window.location.href = "login.html";
    return false;
  }

  return true;
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  if (!token) {
    window.location.href = "login.html";
    throw new Error("Debes iniciar sesión.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el servidor. Verifica que el backend esté activo."
    );
  }

  const responseText = await response.text();
  let data;

  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (error) {
    throw new Error("La API devolvió una respuesta no válida.");
  }

  if (!response.ok) {
    throw new Error(data.message || "Ocurrió un error inesperado.");
  }

  return data;
}

// ==========================================
// MENSAJES Y ESTADO DE GUARDADO
// ==========================================

function showMessage(text, type = "info") {
  messageElement.textContent = text;
  messageElement.className = `message ${type}`;
}

function updateSaveStatus(status) {
  const statusOptions = {
    clean: {
      text: "Sin cambios",
      className: "save-status"
    },
    dirty: {
      text: "Cambios sin guardar",
      className: "save-status warning"
    },
    saving: {
      text: "Guardando...",
      className: "save-status saving"
    },
    saved: {
      text: "Nota guardada",
      className: "save-status success"
    },
    error: {
      text: "Error al guardar",
      className: "save-status error"
    }
  };

  const selectedStatus = statusOptions[status] || statusOptions.clean;

  saveStatus.textContent = selectedStatus.text;
  saveStatus.className = selectedStatus.className;
}

function markAsChanged() {
  hasUnsavedChanges = true;
  updateSaveStatus("dirty");
  saveNoteButton.disabled = false;
}

function markAsSaved() {
  hasUnsavedChanges = false;
  updateSaveStatus("saved");
  saveNoteButton.disabled = true;

  window.setTimeout(() => {
    if (!hasUnsavedChanges) {
      updateSaveStatus("clean");
    }
  }, 1800);
}

// ==========================================
// MODALES
// ==========================================

function openModal(modal) {
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

document.addEventListener("click", (event) => {
  const closeButton = event.target.closest("[data-close-modal]");

  if (closeButton) {
    const modalId = closeButton.dataset.closeModal;
    const modal = document.querySelector(`#${modalId}`);

    if (modal) {
      closeModal(modal);
    }
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
// UTILIDADES PARA LAS NOTAS
// ==========================================

function normalizeContent(content) {
  const oldPlaceholderValues = [
    "<p>Escribe tu nota aqui...</p>",
    "<p>Escribe tu nota aquí...</p>"
  ];

  if (!content || oldPlaceholderValues.includes(content.trim())) {
    return "";
  }

  return content;
}

function getPlainText(html) {
  const temporaryElement = document.createElement("div");
  temporaryElement.innerHTML = html || "";

  return temporaryElement.textContent
    .replace(/\s+/g, " ")
    .trim();
}

function createPreview(content) {
  const plainText = getPlainText(content);

  if (!plainText) {
    return "Nota sin contenido";
  }

  return plainText.length > 70
    ? `${plainText.slice(0, 70)}…`
    : plainText;
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Sin fecha";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getSelectedNote() {
  return notes.find((note) => note.id === selectedNoteId) || null;
}

// ==========================================
// EDITOR
// ==========================================

function setEditor(note) {
  selectedNoteId = note ? note.id : null;
  noteTitle.value = note ? note.title : "";
  noteEditor.innerHTML = note ? normalizeContent(note.content) : "";

  hasUnsavedChanges = false;
  updateSaveStatus("clean");
  saveNoteButton.disabled = true;

  deleteNoteButton.disabled = !note;
  exportPdfButton.disabled = !note;

  renderNotesList();
}

function clearEditor() {
  selectedNoteId = null;
  noteTitle.value = "";
  noteEditor.innerHTML = "";

  hasUnsavedChanges = false;
  updateSaveStatus("clean");
  saveNoteButton.disabled = true;
  deleteNoteButton.disabled = true;
  exportPdfButton.disabled = true;

  renderNotesList();
}

// ==========================================
// LISTA Y BÚSQUEDA
// ==========================================

function renderNotesList() {
  const searchTerm = notesSearch.value.trim().toLowerCase();

  const filteredNotes = notes.filter((note) => {
    const title = (note.title || "").toLowerCase();
    const content = getPlainText(note.content).toLowerCase();

    return title.includes(searchTerm) || content.includes(searchTerm);
  });

  notesList.innerHTML = "";

  if (notes.length === 0) {
    const emptyContainer = document.createElement("div");
    emptyContainer.className = "empty-state";

    emptyContainer.innerHTML = `
      <strong>Todavía no tienes notas</strong>
      <span>Crea tu primera nota para comenzar.</span>
    `;

    const createButton = document.createElement("button");
    createButton.className = "button primary";
    createButton.type = "button";
    createButton.textContent = "Crear primera nota";
    createButton.addEventListener("click", showNewNoteModal);

    emptyContainer.appendChild(createButton);
    notesList.appendChild(emptyContainer);
    return;
  }

  if (filteredNotes.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <strong>No encontramos resultados</strong>
        <span>Prueba con otra palabra o frase.</span>
      </div>
    `;
    return;
  }

  filteredNotes.forEach((note) => {
    const button = document.createElement("button");
    button.className =
      note.id === selectedNoteId
        ? "note-item active"
        : "note-item";

    button.type = "button";
    button.setAttribute("aria-label", `Abrir nota ${note.title}`);

    const title = document.createElement("strong");
    title.className = "note-item-title";
    title.textContent = note.title || "Sin título";

    const preview = document.createElement("span");
    preview.className = "note-item-preview";
    preview.textContent = createPreview(note.content);

    const date = document.createElement("span");
    date.className = "note-item-date";
    date.textContent = `Editada: ${formatDate(note.updated_at)}`;

    button.append(title, preview, date);

    button.addEventListener("click", () => {
      if (
        hasUnsavedChanges &&
        !window.confirm(
          "Tienes cambios sin guardar. ¿Deseas descartarlos y abrir otra nota?"
        )
      ) {
        return;
      }

      setEditor(note);
    });

    notesList.appendChild(button);
  });
}

async function loadNotes(preferredNoteId = null) {
  try {
    notes = await apiRequest("/notes");

    const noteToSelect =
      notes.find((note) => note.id === preferredNoteId) ||
      notes.find((note) => note.id === selectedNoteId) ||
      notes[0] ||
      null;

    if (noteToSelect) {
      setEditor(noteToSelect);
    } else {
      clearEditor();
    }

    renderNotesList();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

// ==========================================
// CREAR NOTA
// ==========================================

function showNewNoteModal() {
  newNoteForm.reset();
  openModal(newNoteModal);

  window.setTimeout(() => {
    newNoteTitle.focus();
  }, 50);
}

async function createNote(title) {
  showMessage("Creando nota...", "info");

  try {
    const data = await apiRequest("/notes", {
      method: "POST",
      body: JSON.stringify({
        title,
        content: "<p></p>"
      })
    });

    const createdNoteId = data.note?.id;

    closeModal(newNoteModal);
    await loadNotes(createdNoteId);

    noteEditor.focus();
    showMessage(`Nota “${title}” creada correctamente.`, "success");
  } catch (error) {
    showMessage(error.message, "error");
  }
}

newNoteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const title = newNoteTitle.value.trim();

  if (!title) {
    showMessage("Escribe un título para crear la nota.", "error");
    newNoteTitle.focus();
    return;
  }

  await createNote(title);
});

// ==========================================
// GUARDAR NOTA
// ==========================================

async function saveNote() {
  const title = noteTitle.value.trim();
  const content = noteEditor.innerHTML.trim();
  const plainContent = getPlainText(content);

  if (!selectedNoteId) {
    showMessage("Crea o selecciona una nota antes de guardar.", "error");
    return;
  }

  if (!title) {
    showMessage("El título de la nota es obligatorio.", "error");
    noteTitle.focus();
    return;
  }

  if (!plainContent) {
    showMessage("Escribe contenido antes de guardar.", "error");
    noteEditor.focus();
    return;
  }

  updateSaveStatus("saving");
  saveNoteButton.disabled = true;

  try {
    await apiRequest(`/notes/${selectedNoteId}`, {
      method: "PUT",
      body: JSON.stringify({ title, content })
    });

    const savedNoteId = selectedNoteId;

    await loadNotes(savedNoteId);
    markAsSaved();

    showMessage("Nota guardada correctamente.", "success");
  } catch (error) {
    updateSaveStatus("error");
    saveNoteButton.disabled = false;
    showMessage(error.message, "error");
  }
}

// ==========================================
// ELIMINAR NOTA
// ==========================================

function showDeleteModal() {
  const selectedNote = getSelectedNote();

  if (!selectedNote) {
    showMessage("Selecciona una nota antes de eliminar.", "error");
    return;
  }

  deleteNoteName.textContent = `“${selectedNote.title}”`;
  openModal(deleteNoteModal);
}

async function confirmDeleteNote() {
  const selectedNote = getSelectedNote();

  if (!selectedNote) {
    closeModal(deleteNoteModal);
    showMessage("La nota seleccionada ya no existe.", "error");
    return;
  }

  confirmDeleteButton.disabled = true;
  confirmDeleteButton.textContent = "Eliminando...";

  try {
    await apiRequest(`/notes/${selectedNote.id}`, {
      method: "DELETE"
    });

    closeModal(deleteNoteModal);

    selectedNoteId = null;
    await loadNotes();

    showMessage(
      `La nota “${selectedNote.title}” fue eliminada.`,
      "success"
    );
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    confirmDeleteButton.disabled = false;
    confirmDeleteButton.textContent = "Eliminar nota";
  }
}

// ==========================================
// FORMATO DEL EDITOR
// ==========================================

function applyFormat(command, value = null) {
  document.execCommand(command, false, value);
  noteEditor.focus();
  markAsChanged();
}

toolbar.addEventListener("click", (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  applyFormat(
    button.dataset.command,
    button.dataset.value || null
  );
});

// ==========================================
// EXPORTACIÓN A PDF
// ==========================================

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafeFileName(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "nota-noty";
}

function exportNoteToPdf() {
  const selectedNote = getSelectedNote();
  const title = noteTitle.value.trim();
  const content = noteEditor.innerHTML.trim();

  if (!selectedNoteId || !title) {
    showMessage("Selecciona una nota antes de exportar.", "error");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    showMessage(
      "El navegador bloqueó la ventana de impresión.",
      "error"
    );
    return;
  }

  const updatedDate =
    selectedNote?.updated_at || new Date().toISOString();

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        >
        <title>${escapeHtml(title)}</title>

        <style>
          @page {
            margin: 22mm 20mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #1f2937;
            background: #ffffff;
            font-family: Arial, Helvetica, sans-serif;
            line-height: 1.65;
          }

          .pdf-header {
            padding-bottom: 18px;
            border-bottom: 2px solid #2563eb;
          }

          .pdf-brand {
            margin: 0 0 8px;
            color: #2563eb;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          h1 {
            margin: 0;
            font-size: 30px;
            line-height: 1.2;
          }

          .pdf-date {
            margin: 10px 0 0;
            color: #6b7280;
            font-size: 13px;
          }

          .pdf-content {
            padding: 30px 0;
          }

          .pdf-content h1,
          .pdf-content h2,
          .pdf-content h3 {
            color: #111827;
            line-height: 1.25;
          }

          .pdf-content img {
            max-width: 100%;
          }

          .pdf-footer {
            margin-top: 40px;
            padding-top: 14px;
            color: #6b7280;
            border-top: 1px solid #dfe4ea;
            font-size: 12px;
            text-align: center;
          }
        </style>
      </head>

      <body>
        <header class="pdf-header">
          <p class="pdf-brand">Noty</p>
          <h1>${escapeHtml(title)}</h1>
          <p class="pdf-date">
            Última actualización:
            ${escapeHtml(formatDate(updatedDate))}
          </p>
        </header>

        <main class="pdf-content">
          ${content}
        </main>

        <footer class="pdf-footer">
          Exportado desde Noty
        </footer>

        <script>
          window.onload = function () {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);

  printWindow.document.close();

  showMessage(
    `Usa “Guardar como PDF” y el nombre ${getSafeFileName(title)}.pdf.`,
    "success"
  );
}

// ==========================================
// EVENTOS
// ==========================================

newNoteButton.addEventListener("click", showNewNoteModal);
saveNoteButton.addEventListener("click", saveNote);
deleteNoteButton.addEventListener("click", showDeleteModal);
confirmDeleteButton.addEventListener("click", confirmDeleteNote);
exportPdfButton.addEventListener("click", exportNoteToPdf);

notesSearch.addEventListener("input", renderNotesList);

noteTitle.addEventListener("input", markAsChanged);
noteEditor.addEventListener("input", markAsChanged);

logoutButton.addEventListener("click", () => {
  if (
    hasUnsavedChanges &&
    !window.confirm(
      "Tienes cambios sin guardar. ¿Deseas cerrar sesión de todos modos?"
    )
  ) {
    return;
  }

  removeToken();
  window.location.href = "login.html";
});

window.addEventListener("beforeunload", (event) => {
  if (!hasUnsavedChanges) {
    return;
  }

  event.preventDefault();
  event.returnValue = "";
});

// ==========================================
// INICIO
// ==========================================

if (protectDashboard()) {
  showMessage("Editor listo.", "success");
  loadNotes();
}