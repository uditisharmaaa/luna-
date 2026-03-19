# Luna — ADHD Productivity Desktop App

**Luna** is a mindful, celestial-themed desktop productivity app designed for ADHD brains. It combines Pomodoro timers, todo lists, journal entries, calendar history, habit tracking, and weekly goals into one beautifully crafted digital space.

---

## App Overview

Luna helps users with ADHD focus through:

- **Pomodoro Timer** — timed work/break cycles with satisfying completion animations
- **Todos** — daily task list with intuitive completion
- **Journal** — date-based reflections and notes
- **Calendar History** — visual overview of past work sessions and achievements
- **Habit Tracker** — build streaks, track daily habits with emoji icons
- **Weekly Goals** — set and complete 3–5 goals per week
- **Stats & Charts** — motivating data visualization (recharts)

**Design Philosophy:** Vintage artsy celestial aesthetic—like an old diary with moon phases, soft ink illustrations, constellation dots, and star motifs. Hand-crafted feel, not flat modern. Everything is intentionally calming and dopamine-friendly for ADHD brains.

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Desktop Framework** | Electron (via vite-plugin-electron) |
| **UI Framework** | React 18+ with TypeScript |
| **Styling** | TailwindCSS v4 (@tailwindcss/vite, NO separate config file) |
| **State Management** | Zustand |
| **Database** | better-sqlite3 (SQLite) |
| **Navigation** | React Router v6 |
| **Charts** | recharts |
| **Build Tool** | Vite |

### TailwindCSS Customization

TailwindCSS v4 uses **CSS @theme** in `src/index.css`—no `tailwind.config.js` file. All color and typography customizations are defined directly in CSS:

```css
@theme {
  --color-cream: #FFF8F0;
  --color-parchment: #F5EDE0;
  /* etc. */
}
```

---

## Color Palette

All colors in hex:

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#FFF8F0` | Page backgrounds, app base |
| **Surface** | `#F5EDE0` | Cards, panels, input fields |
| **Accent** | `#C9B8E8` | Buttons, highlights, active states |
| **Secondary** | `#FFD6E0` | Soft pink, alternative accent |
| **Highlight** | `#B8D4C0` | Sage green, success states, habit streaks |
| **Text** | `#3D3250` | Headings, main text (soft dark purple-brown) |
| **Muted Text** | `#8B7D9B` | Secondary text, borders, disabled states |

---

## Typography

| Font | Usage | Notes |
|------|-------|-------|
| **Playfair Display** | Headings, page titles | Serif, vintage/elegant feel |
| **DM Sans** | Body text, UI labels | Clean, highly readable sans-serif |
| **Caveat** | Journal entries, note labels | Handwritten-style script font |

---

## ADHD UX Principles

Luna is built around principles that reduce cognitive load for ADHD brains:

1. **Minimal Choices** — Avoid overwhelming option overload. Sidebar has 4 main pages: Today, Archive, Goals, Stats.
2. **Dopamine-Friendly Completions** — Satisfying animations and visual feedback when tasks, pomodoros, or habits are completed.
3. **Today-First** — The Today page is the default landing page. Start with what matters today.
4. **Clear Visual Hierarchy** — Most important tasks and timers visually stand out. Time-sensitive items (active pomodoro) grab attention.
5. **Celestial Decorations** — Stars (*), moon phase icons, constellation dots used as dividers to create a calming, playful atmosphere.

---

## Project File Structure

```
luna/
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Router setup, Sidebar layout wrapper
│   ├── index.css                # Global styles, TailwindCSS @theme, font imports
│   ├── pages/
│   │   ├── Today.tsx            # Default page: Pomodoro + Todos + Calendar mini-view
│   │   ├── Archive.tsx          # Past sessions, journal entries, completed todos
│   │   ├── Goals.tsx            # Weekly goals, view past weeks
│   │   └── Stats.tsx            # Charts (pomodoro count, habit streaks, etc.)
│   ├── components/
│   │   ├── Sidebar.tsx          # Navigation, page links, Settings gear
│   │   ├── PomodoroTimer.tsx    # Timer display, start/pause/reset controls
│   │   ├── TodoList.tsx         # Today's todos, add/complete/delete
│   │   ├── Journal.tsx          # Date-based journal entry editor
│   │   ├── CalendarGrid.tsx     # Month/year calendar, visual indicators for work days
│   │   ├── DayDetailPanel.tsx   # Detailed view of a specific day (sessions, todos, notes)
│   │   ├── HabitTracker.tsx     # List of habits, daily check-in, streak display
│   │   └── WeeklyGoals.tsx      # Set/edit/complete weekly goals
│   ├── store/
│   │   └── useStore.ts          # Zustand store (app state, cache layer)
│   └── styles/
│       └── globals.css          # Additional global or component-scoped styles
│
├── electron/
│   ├── main.ts                  # Electron main process, window creation, IPC handlers
│   ├── db.ts                    # SQLite database: schema, migrations, all query functions
│   └── preload.ts               # contextBridge: exposes window.electronAPI to renderer
│
├── public/
│   └── assets/                  # Static images, icons, celestial decorations
│
├── vite.config.ts               # Vite + vite-plugin-electron config
├── tsconfig.json                # TypeScript config
├── tailwind.config.js           # (Not used—use CSS @theme in index.css)
├── package.json
├── CLAUDE.md                    # This file (AI context)
└── README.md                    # User-facing documentation
```

---

## IPC (Inter-Process Communication) Architecture

All database operations flow through Electron's IPC bridge:

```
Renderer (React)
  ↓
window.electronAPI.methodName(args)  ← exposed via contextBridge
  ↓
ipcRenderer.invoke('db-channel', methodName, args)
  ↓
electron/main.ts — ipcMain.handle('db-channel', ...)
  ↓
electron/db.ts — query function executes
  ↓
better-sqlite3 executes SQL
  ↓
Returns result back to Renderer
```

**Key Files:**

- **`electron/main.ts`** — All IPC handlers. Example:
  ```typescript
  ipcMain.handle('db-channel', async (event, method, ...args) => {
    return db[method](...args);
  });
  ```

- **`electron/db.ts`** — All database functions. Example:
  ```typescript
  export function getTodosForDate(date: string) {
    return stmt.all(date);
  }
  ```

- **`electron/preload.ts`** — Exposes safe API. Example:
  ```typescript
  window.electronAPI = {
    getTodosForDate: (date) => ipcRenderer.invoke('db-channel', 'getTodosForDate', date),
  };
  ```

---

## Database Schema

### `pomodoro_sessions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `date` | TEXT | Date string (YYYY-MM-DD) |
| `started_at` | TEXT | ISO 8601 timestamp |
| `completed_at` | TEXT | NULL if still running |
| `duration_minutes` | INTEGER | Planned length (e.g., 25) |
| `completed` | BOOLEAN | 0 = abandoned, 1 = finished |

### `todos`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `date` | TEXT | Date string (YYYY-MM-DD) |
| `text` | TEXT | Task description |
| `completed` | BOOLEAN | 0 = pending, 1 = done |
| `order_index` | INTEGER | Display order |
| `created_at` | TEXT | ISO 8601 timestamp |

### `journal_entries`
| Column | Type | Notes |
|--------|------|-------|
| `date` | TEXT PRIMARY KEY | YYYY-MM-DD, one entry per date |
| `content` | TEXT | Markdown-friendly journal text |
| `updated_at` | TEXT | ISO 8601 timestamp |

### `habits`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `name` | TEXT | Habit name (e.g., "Meditate") |
| `icon` | TEXT | Single emoji (e.g., "🧘") |
| `is_active` | BOOLEAN | 1 = active, 0 = archived |
| `created_at` | TEXT | ISO 8601 timestamp |

### `habit_completions`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `habit_id` | INTEGER FOREIGN KEY | References `habits.id` |
| `date` | TEXT | Date string (YYYY-MM-DD) |
| **UNIQUE** | `(habit_id, date)` | One completion per habit per day |

### `weekly_goals`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PRIMARY KEY | Auto-increment |
| `week_start` | TEXT | Monday's date (YYYY-MM-DD) |
| `text` | TEXT | Goal description |
| `completed` | BOOLEAN | 0 = pending, 1 = done |
| `created_at` | TEXT | ISO 8601 timestamp |

---

## Navigation & Layout

### Sidebar (Left)
```
┌─────────────────────┐
│   ☽ Luna            │ (Logo + app name)
├─────────────────────┤
│ ⭐ Today            │ (Default page)
│ 📜 Archive          │
│ 🌙 Goals            │
│ 📊 Stats            │
├─────────────────────┤
│ ⚙️  Settings        │ (Bottom)
└─────────────────────┘
```

### Pages

- **Today** — Active pomodoro, today's todos, mini calendar, habit check-ins
- **Archive** — Past sessions, journal entries, completed todos, historical view
- **Goals** — Create/edit/view weekly goals, see past weeks
- **Stats** — Charts (pomodoro count by week, habit streaks, completion rates)

---

## Development Guidelines

### State Management (Zustand)

`useStore.ts` handles:
- Current date
- Active pomodoro state
- UI modals/panels (open day detail, edit todo, etc.)
- Cached data from DB (todos, habits, goals)

Always call DB via IPC when data changes; update Zustand after success.

### Component Structure

- **Pages** (`src/pages/`) — Full-page views, handle routing and layout
- **Components** (`src/components/`) — Reusable UI pieces
- Prefer functional components + hooks
- Use TypeScript interfaces for props and state shapes

### Styling

- Use TailwindCSS utility classes (configured via CSS @theme in `index.css`)
- Custom celestial decorations: SVG or CSS (stars, moon phases, constellation dividers)
- Responsive: mobile-first, then tablet/desktop breakpoints
- Dark mode: consider a light mode toggle if needed, but primary theme is warm cream/parchment

### Animations

- Pomodoro completion: satisfying scale + fade animation
- Todo checkbox: quick spin or bounce
- Habit streak updates: celebratory particle effect (optional, use subtle CSS)
- Page transitions: subtle fade or slide

---

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Development server:**
   ```bash
   npm run dev
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Database:**
   - On app launch, `electron/main.ts` initializes SQLite via `electron/db.ts`
   - Schema is created if it doesn't exist
   - IPC handlers connect React to DB

---

## Key Implementation Notes

- **No Tailwind config file** — Use CSS @theme in `src/index.css` for all customization
- **IPC for all DB access** — Never import better-sqlite3 in React; always go through Electron main
- **Zustand as cache** — Use Zustand to avoid re-fetching the same data repeatedly
- **TypeScript everywhere** — Strict mode, interfaces for all data shapes
- **Celestial UX** — Subtle star decorations, moon phases, handwritten font for journal to reinforce vintage aesthetic

---

## Common Tasks

### Adding a New Todo
1. User types in TodoList input and presses Enter
2. React calls `window.electronAPI.addTodo(date, text)`
3. Preload routes to `ipcRenderer.invoke('db-channel', 'addTodo', ...)`
4. Main process calls `db.addTodo(...)` from `electron/db.ts`
5. SQL INSERT executes; returns new todo object
6. React receives result, updates Zustand, re-renders

### Completing a Pomodoro
1. Timer reaches 0:00
2. Play success animation
3. Call `window.electronAPI.completePomodoro(sessionId)`
4. Update DB, update Zustand
5. Show celebration message with confetti/animation

### Viewing Archive
1. User clicks "Archive" in sidebar
2. Route to `/archive` page
3. Fetch past sessions, journal entries, completed todos from DB
4. Display in chronological order with journal content inline

---

## Troubleshooting

- **IPC Errors** — Check electron/main.ts handlers match preload.ts exposures
- **Database Locks** — better-sqlite3 uses synchronous queries; be careful with long operations
- **Styling Issues** — Verify @theme is in src/index.css; check TailwindCSS is building properly
- **Electron Build** — Run `npm run build` to create final app; test via `npm run preview`

---

## Reference

- [Electron Docs](https://www.electronjs.org/docs)
- [React Router v6](https://reactrouter.com/)
- [Zustand](https://github.com/pmndrs/zustand)
- [TailwindCSS v4](https://tailwindcss.com/docs)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [recharts](https://recharts.org/)

---

**Last Updated:** 2026-03-20
