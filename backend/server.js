/**
 * Simple Todo API — Express server with JSON file storage.
 * Run from this folder: node server.js
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const MAX_TEXT_LENGTH = 500;
const MAX_REQUESTS_PER_MINUTE = 120;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const requestLogByIp = new Map();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10kb" }));

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const state = requestLogByIp.get(ip) || { count: 0, windowStart: now };

  if (now - state.windowStart >= RATE_LIMIT_WINDOW_MS) {
    state.count = 0;
    state.windowStart = now;
  }

  state.count += 1;
  requestLogByIp.set(ip, state);

  if (state.count > MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({ error: "Too many requests, please retry later" });
  }

  return next();
}

/**
 * Ensure data.json exists. If missing or unreadable, start with an empty list.
 */
function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      console.log("[data] data.json not found — creating with []");
      fs.writeFileSync(DATA_FILE, "[]", "utf8");
    }
  } catch (err) {
    console.error("[data] Failed to ensure data.json:", err.message);
    throw err;
  }
}

/**
 * Read all tasks from disk. Never crashes on empty or bad JSON — returns [].
 */
function readTasks() {
  try {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const trimmed = raw.trim();

    if (!trimmed) {
      console.log("[data] File is empty — treating as no tasks");
      return [];
    }

    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      console.log("[data] JSON is not an array — resetting to []");
      return [];
    }
    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error("[data] Invalid JSON in data.json — using []:", err.message);
      return [];
    }
    console.error("[data] readTasks error:", err.message);
    throw err;
  }
}

function writeTasks(tasks) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), "utf8");
}

// --- Routes ---

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/tasks", (req, res) => {
  try {
    const tasks = readTasks();
    console.log("[GET /tasks] returning", tasks.length, "task(s)");
    res.json(tasks);
  } catch (err) {
    console.error("[GET /tasks]", err);
    res.status(500).json({ error: "Could not read tasks" });
  }
});

app.post("/tasks", rateLimit, (req, res) => {
  try {
    if (!req.is("application/json")) {
      return res.status(415).json({ error: "Content-Type must be application/json" });
    }

    const text =
      typeof req.body.text === "string" ? req.body.text.trim() : "";

    if (!text) {
      console.log("[POST /tasks] rejected — empty text");
      return res.status(400).json({ error: "text is required (non-empty string)" });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return res
        .status(400)
        .json({ error: `text is too long (max ${MAX_TEXT_LENGTH} characters)` });
    }

    const tasks = readTasks();
    const newTask = {
      id: Date.now(),
      text,
      completed: false,
    };

    tasks.push(newTask);
    writeTasks(tasks);

    console.log("[POST /tasks] created task id=", newTask.id);
    res.status(201).json(newTask);
  } catch (err) {
    console.error("[POST /tasks]", err);
    res.status(500).json({ error: "Could not save task" });
  }
});

app.delete("/tasks/:id", rateLimit, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      console.log("[DELETE /tasks/:id] bad id:", req.params.id);
      return res.status(400).json({ error: "invalid id" });
    }

    const tasks = readTasks();
    const next = tasks.filter((t) => t.id !== id);

    if (next.length === tasks.length) {
      console.log("[DELETE /tasks/:id] not found id=", id);
      return res.status(404).json({ error: "task not found" });
    }

    writeTasks(next);
    console.log("[DELETE /tasks/:id] deleted id=", id);
    res.status(204).send();
  } catch (err) {
    console.error("[DELETE /tasks/:id]", err);
    res.status(500).json({ error: "Could not delete task" });
  }
});

app.put("/tasks/:id", rateLimit, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      console.log("[PUT /tasks/:id] bad id:", req.params.id);
      return res.status(400).json({ error: "invalid id" });
    }

    const tasks = readTasks();
    const index = tasks.findIndex((t) => t.id === id);

    if (index === -1) {
      console.log("[PUT /tasks/:id] not found id=", id);
      return res.status(404).json({ error: "task not found" });
    }

    tasks[index].completed = !tasks[index].completed;
    writeTasks(tasks);

    console.log(
      "[PUT /tasks/:id] toggled id=",
      id,
      "completed=",
      tasks[index].completed
    );
    res.json(tasks[index]);
  } catch (err) {
    console.error("[PUT /tasks/:id]", err);
    res.status(500).json({ error: "Could not update task" });
  }
});

// Start
ensureDataFile();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Todo API listening at http://localhost:${PORT}`);
    console.log("Try: GET http://localhost:3000/tasks");
  });
}

module.exports = { app, readTasks, writeTasks, ensureDataFile, DATA_FILE };
