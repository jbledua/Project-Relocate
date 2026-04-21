# Project-Relocate

**Lightweight box inventory system built with React, Vite, and Supabase for tracking, searching, and managing moving boxes.**

---

## Overview

**Project-Relocate** is a simple web application designed to solve a common moving problem: losing track of what’s inside each box.

Each box is assigned a unique number and stored in a searchable index. Users can:

* Look up a box by number
* Search for items and find which box they’re in
* Store notes and room information
* Attach a photo of the box for quick visual identification

The goal is to provide a fast, minimal system that can scale from a personal move to a reusable inventory tool.

---

## Core Features (MVP)

* 📦 Box numbering system (e.g., `BX-001`)
* 🔍 Search by box number
* 🔎 Search by contents (full-text style)
* 📝 Notes and room assignment per box
* 📷 Optional photo upload per box
* 🔐 User authentication (Supabase Auth)

---

## Tech Stack

| Layer    | Technology                             |
| -------- | -------------------------------------- |
| Frontend | React + Vite                           |
| Backend  | Supabase (PostgreSQL + Auth + Storage) |
| Hosting  | GitHub Pages                           |
| Styling  | (TBD – Tailwind / MUI / minimal CSS)   |

---

## Project Structure

```text
moving-box-tracker/
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   ├── lib/
│   │   └── supabaseClient.js
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── package.json
├── vite.config.js
└── README.md
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/jbledua/Project-Relocate.git
cd Project-Relocate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

### 4. Run development server

```bash
npm run dev
```

### 5. Enable authenticated data access (recommended)

After running `supabase/setup.sql`, run `supabase/auth_policies.sql` in Supabase SQL Editor to require signed-in users for reads/writes.

---

## Supabase Setup (Planned Schema)

### Tables

**boxes**

* `id` (uuid, primary key)
* `box_number` (text, unique)
* `room` (text)
* `label` (text)
* `notes` (text)
* `photo_url` (text)
* `created_at` (timestamp)

**box_items**

* `id` (uuid, primary key)
* `box_id` (foreign key → boxes.id)
* `content` (text)

---

## Deployment (GitHub Pages)

Build the project:

```bash
npm run build
```

Set the correct base path in `vite.config.js`:

```js
export default {
  base: '/',
}
```

For this repo's GitHub Actions deployment, the workflow builds with `--base=/` for the custom domain `moving.ledua.ca`.

Then deploy using:

* GitHub Pages (branch deployment), or
* GitHub Actions (recommended for automation)

---

## Roadmap

### Phase 1 (Current)

* Basic CRUD for boxes
* Search (box + contents)
* Supabase integration

### Phase 2

* 📷 Image upload via Supabase Storage
* 📱 Mobile-friendly UI
* 🏷 Room-based filtering

### Phase 3

* 🔳 QR code generation per box
* 📷 Scan QR → open box details
* 📤 Bulk import/export (CSV)

### Phase 4 (Stretch)

* Multi-user household support
* Move history / archive mode
* Tagging system

---

## Design Philosophy

* **Simple first** – prioritize usability over features
* **Search-driven** – finding items is the primary workflow
* **Stateless-friendly** – works well even if used temporarily during a move
* **Extensible** – can evolve into general inventory tracking

---

Perfect—then you just need to explicitly include it in the README and add the license file to the repo.

Here’s the clean way to finish your README:

---

## License

This project is licensed under the MIT License.

See the [License](LICENSE) file for details.

---
