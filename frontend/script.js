/**
 * Todo frontend — talks to the Express API at BASE_URL.
 * Open index.html in the browser while the server is running.
 */

const BASE_URL = "http://localhost:3000";

const taskListEl = document.getElementById("task-list");
const addFormEl = document.getElementById("add-form");
const taskInputEl = document.getElementById("task-input");
const statusEl = document.getElementById("status");

function setStatus(message, isError = false) {
  statusEl.textContent = message || "";
  statusEl.classList.toggle("status--error", Boolean(isError));
}

/**
 * Load all tasks from the server and redraw the list.
 */
async function loadTasks() {
  console.log("[loadTasks] fetching GET /tasks");
  setStatus("Loading…");

  try {
    const res = await fetch(`${BASE_URL}/tasks`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const tasks = await res.json();
    console.log("[loadTasks] got", tasks.length, "task(s)");
    renderTasks(tasks);
    setStatus("");
  } catch (err) {
    console.error("[loadTasks]", err);
    setStatus(
      "Could not load tasks. Is the server running? (node server.js in backend/)",
      true
    );
    renderTasks([]);
  }
}

/**
 * Render the task array into the page.
 */
function renderTasks(tasks) {
  taskListEl.innerHTML = "";

  if (!tasks.length) {
    const hint = document.createElement("li");
    hint.className = "empty-hint";
    hint.textContent = "No tasks yet — add one above.";
    taskListEl.appendChild(hint);
    return;
  }

  for (const task of tasks) {
    const li = document.createElement("li");
    li.className = "task-item" + (task.completed ? " task-item--done" : "");
    li.dataset.id = String(task.id);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-item__toggle";
    checkbox.checked = Boolean(task.completed);
    checkbox.setAttribute("aria-label", "Mark complete");
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const span = document.createElement("span");
    span.className = "task-item__text";
    span.textContent = task.text;

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn--danger task-item__delete";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(delBtn);
    taskListEl.appendChild(li);
  }
}

/**
 * Add a new task (POST).
 */
async function addTask(text) {
  console.log("[addTask]", text);
  const res = await fetch(`${BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || `HTTP ${res.status}`);
  }

  await loadTasks();
}

/**
 * Delete a task (DELETE).
 */
async function deleteTask(id) {
  console.log("[deleteTask] id=", id);
  const res = await fetch(`${BASE_URL}/tasks/${id}`, { method: "DELETE" });

  if (res.status === 404) {
    await loadTasks();
    return;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  await loadTasks();
}

/**
 * Toggle completed (PUT).
 */
async function toggleTask(id) {
  console.log("[toggleTask] id=", id);
  const res = await fetch(`${BASE_URL}/tasks/${id}`, { method: "PUT" });

  if (res.status === 404) {
    await loadTasks();
    return;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  await loadTasks();
}

addFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = taskInputEl.value.trim();
  if (!text) {
    setStatus("Please enter some text for the task.", true);
    return;
  }

  setStatus("Saving…");
  try {
    await addTask(text);
    taskInputEl.value = "";
    taskInputEl.focus();
    setStatus("");
  } catch (err) {
    console.error("[addTask failed]", err);
    setStatus("Could not add task. Check the server.", true);
  }
});

// First paint
loadTasks();
