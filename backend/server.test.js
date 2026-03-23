const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const { app } = require("./server");

test("GET /health returns service status", async () => {
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.status, "ok");
  assert.equal(typeof res.body.uptimeSec, "number");
  assert.equal(typeof res.body.timestamp, "string");
});

test("POST /tasks rejects empty task text", async () => {
  const res = await request(app)
    .post("/tasks")
    .set("Content-Type", "application/json")
    .send({ text: "   " });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /required/);
});

test("POST /tasks rejects text over 500 chars", async () => {
  const res = await request(app)
    .post("/tasks")
    .set("Content-Type", "application/json")
    .send({ text: "a".repeat(501) });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /max 500/);
});

test("POST /tasks requires application/json", async () => {
  const res = await request(app)
    .post("/tasks")
    .set("Content-Type", "text/plain")
    .send("task");

  assert.equal(res.status, 415);
});
