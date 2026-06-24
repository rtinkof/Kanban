// Единая точка для всех обращений к backend.
// Все функции возвращают уже распарсенный JSON-ответ сервера.
// При ошибке (сеть, 4xx, 5xx) — бросают Error с понятным текстом message.

const BASE_URL = "http://localhost:5000/api";

const TOKEN_KEY = "kanban-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Базовая обёртка над fetch: подставляет адрес сервера, токен авторизации,
// и приводит ответ к единому виду { ok, data, status }.
async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    // сервер недоступен / нет сети
    throw new Error("Не удалось связаться с сервером. Проверьте, что backend запущен.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    // тело ответа могло быть пустым — не страшно
  }

  if (!res.ok) {
    const message = data?.message || `Ошибка сервера (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

/* ===================== AUTH ===================== */

// Создание нового сотрудника — доступно только администратору (ADMIN),
// проверяется на сервере через requireAuth + requireRole("ADMIN").
export function apiRegisterEmployee({ login, password, firstName, lastName, email, role }) {
  return request("/auth/register", {
    method: "POST",
    body: { login, password, firstName, lastName, email, role },
  });
}

export function apiLogin({ login, password }) {
  return request("/auth/login", { method: "POST", body: { login, password } });
}

export function apiMe() {
  return request("/auth/me");
}

// Список сотрудников компании. archived=true — получить архивных вместо активных.
export function apiGetAllUsers(archived = false) {
  return request(`/auth/users${archived ? "?archived=true" : ""}`);
}

// Редактирование данных сотрудника (логин/имя/фамилия/email/роль) — только ADMIN.
// patch может содержать любое подмножество полей.
export function apiUpdateUser(userId, patch) {
  return request(`/auth/users/${userId}`, { method: "PATCH", body: patch });
}

// Сброс/задание нового пароля сотруднику — только ADMIN.
export function apiResetUserPassword(userId, password) {
  return request(`/auth/users/${userId}/password`, { method: "PATCH", body: { password } });
}

// Отправить сотрудника в архив (мягкое удаление: теряет доступ и выпадает
// из всех проектов, но данные и назначения на карточках сохраняются).
export function apiArchiveUser(userId) {
  return request(`/auth/users/${userId}/archive`, { method: "POST" });
}

// Вернуть сотрудника из архива (доступ восстанавливается, участие в
// проектах нужно будет настроить заново).
export function apiRestoreUser(userId) {
  return request(`/auth/users/${userId}/restore`, { method: "POST" });
}

/* ===================== PROJECTS ===================== */

export function apiGetProjects() {
  return request("/projects");
}

export function apiCreateProject({ title, description }) {
  return request("/projects", { method: "POST", body: { title, description } });
}

export function apiGetProjectMembers(projectId) {
  return request(`/projects/${projectId}/members`);
}

export function apiAddProjectMember(projectId, { userId, role }) {
  return request(`/projects/${projectId}/members`, { method: "POST", body: { userId, role } });
}

export function apiRemoveProjectMember(projectId, userId) {
  return request(`/projects/${projectId}/members/${userId}`, { method: "DELETE" });
}

/* ===================== BOARDS ===================== */

export function apiGetBoards(projectId) {
  return request(`/projects/${projectId}/boards`);
}

export function apiCreateBoard(projectId, title) {
  return request(`/projects/${projectId}/boards`, { method: "POST", body: { title } });
}

export function apiRenameBoard(boardId, title) {
  return request(`/boards/${boardId}`, { method: "PATCH", body: { title } });
}

export function apiDeleteBoard(boardId) {
  return request(`/boards/${boardId}`, { method: "DELETE" });
}

/* ===================== COLUMNS ===================== */

export function apiCreateColumn(boardId, title) {
  return request(`/boards/${boardId}/columns`, { method: "POST", body: { title } });
}

export function apiRenameColumn(columnId, title) {
  return request(`/columns/${columnId}`, { method: "PATCH", body: { title } });
}

export function apiDeleteColumn(columnId) {
  return request(`/columns/${columnId}`, { method: "DELETE" });
}

export function apiMoveColumn(columnId, position) {
  return request(`/columns/${columnId}/position`, { method: "PATCH", body: { position } });
}

/* ===================== CARDS ===================== */

export function apiCreateCard(columnId, text) {
  return request(`/columns/${columnId}/cards`, { method: "POST", body: { text } });
}

// patch может содержать любое подмножество: { text, completed, deadline, assigneeId }
export function apiUpdateCard(cardId, patch) {
  return request(`/cards/${cardId}`, { method: "PATCH", body: patch });
}

export function apiDeleteCard(cardId) {
  return request(`/cards/${cardId}`, { method: "DELETE" });
}

export function apiMoveCard(cardId, columnId, position) {
  return request(`/cards/${cardId}/move`, { method: "PATCH", body: { columnId, position } });
}

/* ===================== STICKERS ===================== */

export function apiAddSticker(cardId, { type, value }) {
  return request(`/cards/${cardId}/stickers`, { method: "POST", body: { type, value } });
}

export function apiUpdateSticker(stickerId, value) {
  return request(`/stickers/${stickerId}`, { method: "PATCH", body: { value } });
}

export function apiDeleteSticker(stickerId) {
  return request(`/stickers/${stickerId}`, { method: "DELETE" });
}

/* ===================== CUSTOM STICKERS ===================== */

export function apiGetCustomStickers(boardId) {
  return request(`/boards/${boardId}/custom-stickers`);
}

export function apiCreateCustomSticker(boardId, { type, icon, text, states, value }) {
  return request(`/boards/${boardId}/custom-stickers`, {
    method: "POST",
    body: { type, icon, text, states, value }
  });
}

// И для обновления:
export function apiUpdateCustomSticker(stickerId, patch) {
  return request(`/custom-stickers/${stickerId}`, {
    method: "PATCH",
    body: patch
  });
}

export function apiDeleteCustomSticker(stickerId) {
  return request(`/custom-stickers/${stickerId}`, {
    method: "DELETE"
  });
}
