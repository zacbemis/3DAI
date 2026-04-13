# 3DAI

**3DAI** is a desktop app that turns plain-English descriptions into 3D-printable models — instantly. Just type what you want, and an AI builds it for you.

<p align="center">
  <img src="https://github.com/user-attachments/assets/c2d120d9-ead8-4fcf-9085-1c9192d3d328" alt="3DAI in action" width="700" />
</p>

---

## What is 3DAI?

3DAI lets anyone create 3D models without learning CAD software. You have a conversation with an AI — describe the shape, size, or object you have in mind — and 3DAI generates a fully 3D-printable model right inside the app. No prior design experience needed.

---

## How it works

### 1. Describe your model

Open the chat and type what you want to create. It can be as simple as *"a hollow cylinder with a lid"* or as detailed as you like.

<p align="center">
  <img src="https://github.com/user-attachments/assets/5976ada1-5326-4051-9769-8aaf6fd28086" alt="Typing a prompt in the chat" width="700" />
</p>

### 2. Watch it come to life

3DAI generates the model and displays it in a live 3D viewer. Spin it around, zoom in, and inspect it from every angle.

<p align="center">
  <img src="https://github.com/user-attachments/assets/940ccfe3-30cd-4520-837b-78f88d17c2a3" alt="Live 3D preview" width="700" />
</p>

### 3. Refine with follow-ups

Not quite right? Just keep chatting. Say *"make it taller"* or *"add a hole in the top"* — 3DAI updates the model in real time based on your feedback.

<p align="center">
  <img src="https://github.com/user-attachments/assets/8c58fbab-415b-4556-8e06-42fcfc39a1b0" alt="Iterating on a model through chat" width="700" />
</p>

---

## What you get

- **Instant 3D models from text** — no CAD skills required
- **Live interactive preview** — rotate, zoom, and inspect your model before printing
- **Iterative chat** — keep refining your model through natural conversation until it's exactly right
- **3D-print ready** — every model exports as a standard STL file, ready to send to any printer
- **Your models, saved** — sign in to save your creations and come back to them any time
- **Powered by state-of-the-art AI** — backed by Claude (Anthropic) or Gemini (Google)

---

## Built with

| Area | Technology |
|---|---|
| Desktop app | [Electron](https://www.electronjs.org/) + [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| 3D viewer | [Three.js](https://threejs.org/) |
| AI models | [Anthropic Claude](https://www.anthropic.com/) · [Google Gemini](https://deepmind.google/technologies/gemini/) |
| 3D compilation | [OpenSCAD](https://openscad.org/) (text → STL) |
| Auth & cloud storage | [Supabase](https://supabase.com/) |

---

## License

MIT
