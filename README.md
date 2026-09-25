# Kanso (簡素) — Minimalist Offline-First Todo

A high-performance, edge-ready, offline-first Todo application built with **React 19**, **Tailwind CSS v4**, **Hono**, and **Cloudflare Workers + D1 (SQLite)**.

> *Kanso (簡素)* is the Japanese aesthetic principle of simplicity, clarity, and the elimination of unnecessary clutter.

---

## Features

- ⚡️ **Edge Powered**: Sub-millisecond API responses powered by Hono running on Cloudflare Workers.
- 💾 **Serverless Relational Database**: Cloudflare D1 (SQLite) with zero-cold-start edge querying.
- 📱 **Offline-First Engine**:
  - Optimistic UI updates with instant local persistence.
  - Automatic mutation queue for offline creates, updates, and deletes.
  - Auto-replay queue upon reconnection (`online` event listener).
  - Sync indicator dot: 🟢 Synced, 🟡 Queued changes, 🔴 Offline.
- 🧠 **Natural Language Quick Add**:
  - `#list`: Target or auto-create a specific list (e.g., `Buy almond milk #groceries`).
  - `!1`, `!2`, `!3` (or `!`, `!!`, `!!!`): Priority level (High, Medium, Low).
  - `@9am`, `@14:30`, `@3pm`: Specific due and reminder time.
  - Relative dates: `today`, `tomorrow`, `friday`, `in 3 days`, `dec 25`.
- 🌳 **Hierarchical Subtasks**:
  - Add nested child tasks under any task.
  - Live completion progress counter (e.g. `2/4`).
  - Cascading deletion and cleanup.
- 🔁 **Smart Recurrence Engine**:
  - Repeat every day, weekdays (Mon–Fri), every week, or every month.
  - Checking off a recurring task automatically schedules and spawns the next occurrence.
- 👥 **List Sharing & Collaboration**:
  - Share lists with teammates by email.
  - Real-time collaboration with shared member indicators.
- ⌨️ **Linear / Superhuman Keyboard Shortcuts**:
  - `n`: New task
  - `/`: Focus search
  - `j` / `k` (or arrows): Navigate through tasks
  - `x`: Toggle completion
  - `e` / `Enter`: Edit selected task
  - `d`: Delete selected task
  - `t`: Toggle dark/light theme
  - `?`: Open keyboard shortcuts cheat sheet
  - `Esc`: Close modal or collapse task editor
- 🌓 **Dark & Light Mode**: Class-based theme switching with system appearance fallback.
- 📲 **Mobile Enhancements**: Slide-over drawer, one-tap list chips, touch area optimization, and iOS safe area padding.
- ↩️ **Undo Actions**: Instant undo snackbar when deleting tasks.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Styling & Icons** | Tailwind CSS v4 + Lucide React |
| **Frontend Hosting** | Vercel (with Edge API rewrites) |
| **Backend API** | Hono on Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite) |
| **PWA & Offline** | Service Worker + LocalStorage Replay Queue |

---

## Development & Deployment

### Local Development
```bash
bun install
bun run db:migrate   # Set up local SQLite D1 database
bun run dev          # Starts Vite on :5173 and Wrangler on :8787
```

### Backend Deployment (Cloudflare Workers + D1)
```bash
bun run db:migrate:prod
bun run deploy
```

### Frontend Deployment (Vercel)
The project includes a `vercel.json` with edge rewrites that seamlessly proxy `/api/*` to the Cloudflare Worker backend:
```bash
vercel --prod
```
