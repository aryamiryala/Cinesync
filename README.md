# Cinesync — Film Location Intelligence
### DSCI-560 Capstone

A domain-specific AI group chat system for film production location management.
Uses **RAG (ChromaDB)** + **GPT-4o mini (OpenAI API)** + **FastAPI** + **React**.

---

## Quick Start (Local Demo)

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key (set in `backend/.env`)

---

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

pip install -r requirements.txt
```

Create a `.env` file in the `backend/` folder:
```
OPENAI_API_KEY=sk-...
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
Seeded 15 documents into ChromaDB
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Verify at: http://localhost:8000/health

---

### 2. Frontend Setup

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:5173**

---

## Demo Flow

1. **Open** http://localhost:5173
2. **Show** the existing conversation — CinesyncAI already answered TMZ status and magic hour questions
3. **Switch role** to "Producer" using the dropdown (top right)
4. **Ask:** *"What's the permit cost for 80 crew members on a city street for 3 days?"*
5. **Switch role** to "Location Manager"
6. **Upload** a location photo (📎 button) and send: *"Can we film here? Analyze for compliance."*
7. **Show** the structured AI response with RAG sources
8. **Switch role** to "Director" and ask about natural light
9. **Click "📍 TMZ LOOKUP"** in the sidebar — check Griffith Observatory (inside) vs a Malibu address (outside) to show the budget contrast

---

## Architecture

```
User (React Frontend, port 5173)
        │  HTTP POST /api/chat
        │  HTTP POST /api/tmz-lookup
        ▼
FastAPI Backend (port 8000)
        │
        ├─ ChromaDB ──► RAG Query (top-4 relevant docs)
        │               [FilmLA ordinances, TMZ rules,
        │                noise laws, union rules, logistics]
        │
        └─ OpenAI API (GPT-4o mini)
                          - Text: RAG context + role-tailored system prompt
                          - Vision: real image analysis on location photo uploads
                          - Returns: structured compliance report
```

---

## Features Implemented (Milestone 2 = ~40% of total)

| Feature | Status |
|---------|--------|
| React group chat UI | ✅ Done |
| Multi-role switching (Director, Producer, etc.) | ✅ Done |
| Image upload + drag-and-drop | ✅ Done |
| Real vision analysis on uploaded photos | ✅ Done |
| FastAPI backend | ✅ Done |
| ChromaDB knowledge base (15 docs) | ✅ Done |
| RAG retrieval on every query | ✅ Done |
| Role-tailored AI responses | ✅ Done |
| Multi-turn conversation memory | ✅ Done |
| TMZ zone reference data | ✅ Done |
| FilmLA permit categories + costs | ✅ Done |
| Noise ordinance data | ✅ Done |
| Union rules (DGA, IATSE) | ✅ Done |
| GPS/address → TMZ lookup tool | ✅ Done |
| Hybrid TMZ boundary (contractual + geometric) | ✅ Done |
| Switched from local Llama to GPT-4o mini API | ✅ Done |
| Real FilmLA API integration | 🔜 Week 5 |
| Sun-path diagram generation | 🔜 Week 6 |
| Mobile app (Android TWA) | 🔜 Week 5-6 |
| User auth + persistent rooms | 🔜 Week 3-4 |

---

## LLM Migration Note (Milestone 2)

The project originally used **Llama 3.1 8B (Q4_K_M)** running locally via llama.cpp.
This was replaced with the **OpenAI GPT-4o mini API** for the following reasons:

- Local model required ~5GB storage and ran CPU-only on macOS 12 (very slow)
- GPT-4o mini responses come back in seconds vs. 30–60s locally
- GPT-4o mini supports **real vision/image analysis** — uploaded location photos
  are now genuinely analyzed rather than described as a text note
- Cost at class-project scale is negligible (< $1 total estimated)
- All RAG logic, ChromaDB embeddings, and FastAPI architecture remain unchanged

---

## Team
- **Arya Miryala** (Tech Lead) — Backend, RAG, AI integration, APIs
- **Grace Wu** (Business Lead) — Market strategy, pricing, interviews
- **Hui Xie** (Product Lead) — UI/UX, wireframes, frontend
