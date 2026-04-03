# Cinesync — Film Location Intelligence
### DSCI-560 Capstone 

A domain-specific AI group chat system for film production location management.
Uses **RAG (ChromaDB)** + **Llama 3 (llama.cpp)** + **FastAPI** + **React**.

---

## 🚀 Quick Start (Local Demo)

### Prerequisites
- Python 3.10+
- Node.js 18+
- cmake (for building llama.cpp)

---

### 1. LLM Server Setup (llama.cpp)

**Build llama.cpp:**
```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
cmake -B build
cmake --build build --config Release
```

**Download the model (~4.7GB):**
```bash
mkdir -p llama.cpp/models
cd llama.cpp/models
curl -L -o llama3-8b.gguf "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf"
```

**Start the server (CPU-only mode for stability on macOS 12):**
```bash
cd llama.cpp/build/bin
DYLD_LIBRARY_PATH=$(pwd) ./llama-server \
  -m /full/path/to/llama.cpp/models/llama3-8b.gguf \
  --host 0.0.0.0 --port 8001 --ctx-size 2048 \
  --no-warmup --n-gpu-layers 0
```

You should see:
```
main: model loaded
main: server is listening on http://0.0.0.0:8001
```

---

### 2. Backend Setup

Open a **new terminal**:

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

You should see:
```
Seeded 15 documents into ChromaDB
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Verify at: http://localhost:8000/health

---

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## Demo Flow

1. **Open** http://localhost:3000
2. **Show** the existing conversation — CinesyncAI already answered TMZ status and magic hour questions
3. **Switch role** to "Producer" using the dropdown (top right)
4. **Ask:** *"What's the permit cost for 80 crew members on a city street for 3 days?"*
5. **Switch role** to "Location Manager"
6. **Upload** a location photo (📎 button) and send: *"Can we film here? Analyze for compliance."*
7. **Show** the structured AI response with RAG sources
8. **Switch role** to "Director" and ask about natural light

---

## Architecture 

```
User (React Frontend, port 3000)
        │  HTTP POST /api/chat
        ▼
FastAPI Backend (port 8000)
        │
        ├─ ChromaDB ──► RAG Query (top-4 relevant docs)
        │               [FilmLA ordinances, TMZ rules,
        │                noise laws, union rules, logistics]
        │
        └─ llama.cpp server (port 8001)
                          - Model: Llama 3.1 8B Instruct (Q4_K_M)
                          - OpenAI-compatible API
                          - System: RAG context + role prompt
                          - Returns: structured compliance report
```

---

## 📋 Features Implemented (Milestone 1 = ~30% of total)

| Feature | Status |
|---------|--------|
| React group chat UI | ✅ Done |
| Multi-role switching (Director, Producer, etc.) | ✅ Done |
| Image upload + drag-and-drop | ✅ Done |
| FastAPI backend | ✅ Done |
| ChromaDB knowledge base (15 docs) | ✅ Done |
| RAG retrieval on every query | ✅ Done |
| Role-tailored AI responses | ✅ Done |
| Multi-turn conversation memory | ✅ Done |
| TMZ zone reference data | ✅ Done |
| FilmLA permit categories + costs | ✅ Done |
| Noise ordinance data | ✅ Done |
| Union rules (DGA, IATSE) | ✅ Done |
| GPS-based TMZ lookup | 🔜 Week 4 |
| Real FilmLA API integration | 🔜 Week 5 |
| Sun-path diagram generation | 🔜 Week 6 |
| Mobile app (Android TWA) | 🔜 Week 5-6 |
| User auth + persistent rooms | 🔜 Week 3-4 |

---

## 👥 Team
- **Arya Miryala** (Tech Lead) — Backend, RAG, AI integration, APIs
- **Grace Wu** (Business Lead) — Market strategy, pricing, interviews
- **Hui Xie** (Product Lead) — UI/UX, wireframes, frontend
