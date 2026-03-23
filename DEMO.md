# Demo CI/CD & NFR — checklist thuyết trình

## CI (Continuous Integration)

- [ ] Mở repo trên GitHub → tab **Actions** → workflow **CI** chạy xanh khi push/PR.
- [ ] Giải thích: `npm ci` + `npm test` trong `backend/` (xem `.github/workflows/ci.yml`).
- [ ] Test kiểm tra `/health`, validation POST `/tasks` (xem `backend/server.test.js`).

## CD (Continuous Deployment)

- [ ] Trên Render: service backend đã gắn **Deploy Hook** (Settings → Deploy Hook).
- [ ] Trên GitHub: **Settings → Secrets → Actions** → secret `RENDER_DEPLOY_HOOK_URL` = URL deploy hook.
- [ ] Push lên `main` hoặc chạy thủ công workflow **CD Render** (Actions → CD Render → Run workflow).
- [ ] Xác nhận deploy mới trên Render (Logs / Events).

## NFR (Non-functional requirements)

- [ ] **Availability / vận hành**: `GET /health` trả JSON `status: "ok"` (dùng cho probe/uptime).
- [ ] **Performance / bảo vệ tải**: rate limit ghi API (POST/PUT/DELETE) ~120 req/phút/IP; body JSON tối đa ~10kb.
- [ ] **Reliability / đầu vào**: text task tối đa 500 ký tự; POST `/tasks` bắt buộc `Content-Type: application/json`.
- [ ] File tham chiếu mục tiêu NFR: `backend/nfr.targets.json`.

## Chạy local (nếu demo máy)

- Backend: `cd backend && npm install && npm start` (port 3000).
- Frontend: mở `frontend/index.html` qua static server; `localhost` tự trỏ API về `http://localhost:3000` (`frontend/script.js`).
