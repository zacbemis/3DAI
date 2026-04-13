# 3DAI

**3DAI** is a desktop application that lets you generate, modify, and iterate on 3D models using natural language. Describe what you want, and the AI generates OpenSCAD code, compiles it into an STL, and renders it live in the app.

<p align="center">
  <img src="https://github.com/user-attachments/assets/c2d120d9-ead8-4fcf-9085-1c9192d3d328" alt="3DAI Demo" width="700" />
</p>

---

## Features

- 💬 **Chat-based 3D generation** — describe your model in plain English and get a 3D-printable STL
- 🔄 **Iterative refinement** — follow-up messages modify or revise the current model in context
- 🤖 **Multi-model AI** — supports both **Anthropic Claude** and **Google Gemini**, switchable at runtime
- 🔭 **Live 3D preview** — interactive Three.js viewer renders the model directly in the app
- ☁️ **Cloud sync** — models and renders are stored in Supabase Storage, tied to your account
- 🔐 **Auth** — email/password sign-up, login, and password reset powered by Supabase Auth

---

## Screenshots & Demo

<p align="center">
  <img src="https://github.com/user-attachments/assets/5976ada1-5326-4051-9769-8aaf6fd28086" alt="Chat interface" width="700" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/940ccfe3-30cd-4520-837b-78f88d17c2a3" alt="3D model viewer" width="700" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/8c58fbab-415b-4556-8e06-42fcfc39a1b0" alt="Generation flow" width="700" />
</p>

---

## Architecture

| Layer | Tech |
|-------|------|
| Desktop app | Electron + React + TypeScript + Tailwind v4 |
| 3D viewer | Three.js |
| AI backend | Node.js / Express (`services/master`) |
| AI providers | Anthropic Claude, Google Gemini |
| 3D compilation | OpenSCAD (`.scad` → `.stl`) |
| Auth & storage | Supabase (Auth + Storage) |

```
3DAI/
├── app/                  # Electron + React frontend
│   └── src/
│       ├── pages/        # Landing, Login, Signup, Chat
│       └── components/   # 3D viewer, chat UI, auth forms
├── services/
│   └── master/           # Express API — AI generation & STL export
│       └── src/
│           ├── ai/       # Claude & Gemini integrations
│           └── ...       # OpenSCAD lint, render, export
├── infra/
│   ├── docker/           # Docker setup
│   └── supabase/         # DB migrations & storage config
└── packages/
    └── shared/           # Shared TypeScript types
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [OpenSCAD](https://openscad.org/downloads.html) installed and on `PATH` (or set `OPENSCAD_PATH`)
- A [Supabase](https://supabase.com/) project
- An **Anthropic** and/or **Google Gemini** API key

---

### 1. Start the AI backend (`services/master`)

```bash
cd services/master
cp .env.example .env
# Fill in ANTHROPIC_API_KEY or GEMINI_API_KEY, and Supabase credentials
npm install
npm start
# Runs on http://127.0.0.1:3000
```

### 2. Start the Electron app (`app`)

```bash
cd app
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

---

### Environment Variables

**`services/master/.env`**

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key (takes priority over Gemini) |
| `GEMINI_API_KEY` | Google Gemini API key (used when Anthropic key is not set) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (needed for DB writes) |
| `OPENSCAD_PATH` | Path to OpenSCAD binary if not on `PATH` |
| `OPENSCAD_TIMEOUT_MS` | STL export timeout in ms (default: 600000) |

**`app/.env`**

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_MASTER_API_URL` | Master API URL (default: `http://127.0.0.1:3000`) |

---

## API Reference

The master service exposes the following endpoints:

| Method | Path | Description |
|---|---|---|
| `GET` | `/models` | List available AI models |
| `POST` | `/generate` | Generate a new 3D model from a prompt |
| `POST` | `/modify` | Modify the current model with a follow-up instruction |
| `POST` | `/revise` | Revise and improve the current model |

Responses include the STL binary with headers:
- `X-Generated-Format` — format of the response (`stl` or `scad`)
- `X-Scad-Base64` — base64-encoded OpenSCAD source
- `X-Fix-Retries` — number of auto-fix retries performed

---

## License

MIT
