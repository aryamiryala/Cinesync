# Cinesync — Film Location Intelligence
### DSCI-560 Capstone · Team StandAI

A domain-specific AI group chat system for film production location management.
Uses **RAG (ChromaDB + real PDF documents)** + **GPT-4o mini (OpenAI API)** + **FastAPI** + **React**.

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

**Seed the knowledge base (run once):**
```bash
python ingest_docs.py
```

You should see:
```
🎉 Ingestion Complete: 251 total chunks across 12 docs
✅ ChromaDB is ready at: ./chroma_db
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

You should see:
```
✅ ChromaDB loaded — 251 chunks ready
INFO:     Uvicorn running on http://127.0.0.1:8000
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
4. **Ask:** *"I'm filming in Burbank on a Saturday with 80 crew members, including pyrotechnics. What do I need and what will it cost?"*
   - Watch it cite real FilmLA permit fees, LAFD surcharges, and insurance minimums from the actual documents
5. **Switch role** to "Location Manager"
6. **Upload** a location photo (📎 button) and send: *"Can we film here? Analyze for compliance."*
7. **Show** the structured AI response with RAG sources
8. **Switch role** to "Director" and ask: *"What time is golden hour at Griffith Observatory this weekend?"*
9. **Click "📍 TMZ LOOKUP"** in the sidebar — check Griffith Observatory (inside) vs a Malibu address (outside) to show the budget contrast

---

## Architecture

```
User (React Frontend, port 5173)
        │  HTTP POST /api/chat
        │  HTTP POST /api/tmz-lookup
        │  HTTP POST /api/sun-path
        ▼
FastAPI Backend (port 8000)
        │
        ├─ ChromaDB (Persistent) ──► Role-filtered RAG Query (top-6 chunks)
        │   251 chunks from 12 official documents
        │   Metadata filtering by doc_type + role_relevance
        │   Embeddings: sentence-transformers/all-MiniLM-L6-v2
        │
        └─ OpenAI API (GPT-4o mini)
                - Text: RAG context + role-tailored system prompt
                - Vision: real image analysis on location photo uploads
                - Returns: structured compliance report citing source documents
```

---

## Knowledge Base — Official Source Documents

The RAG system is built from **12 real authoritative documents** (251 chunks total).
All documents are ingested via `ingest_docs.py` into a persistent ChromaDB collection.

| Document | Source | Chunks | Covers |
|----------|--------|--------|--------|
| 30-MILE-STUDIO-ZONE.pdf | California Film Commission | 3 | TMZ boundaries, secondary zone, center point |
| Area Requirements: City of Los Angeles | FilmLA | 13 | Permits, deadlines, insurance, LAFD/LAPD rules |
| Area Requirements: County of Los Angeles | FilmLA | 12 | County permit requirements, unincorporated areas |
| Common Fees, LA City | FilmLA | 4 | LAPD officers, LAFD, lane closures, monitor rates |
| Common Fees, LA County | FilmLA | 5 | County-specific fee schedule |
| FilmLA Basic Fees List | FilmLA | 2 | Base application fees, rider fees |
| Film Unit: LA Fire Department | LAFD | 8 | Fire safety officers, special effects, inspections |
| Noise Enforcement Team | LAPD | 5 | Noise ordinance rules, complaint procedures |
| DGA Basic Agreement 2020 — Section 13 | DGA | 61 | AD/UPM work hours, rest periods, overtime, distant location |
| DGA Basic Agreement 2020 — Travel (§4-104) | DGA | 2 | Director travel rules, 30-mile zone reporting |
| DGA Basic Agreement 2020 — Director Location (§9) | DGA | 4 | Distant location notice, flight allowance |
| 2024 IATSE Basic Agreement MOA | IATSE | 132 | Below-the-line crew wages, hours, per diem |

### Chunking Strategy
- Section-aware splitting on legal markers (e.g. `13-110`, `Section 4`) keeps legal clauses intact
- Chunk size: ~1,800 characters with 200-character overlap
- Each chunk carries metadata: `doc_type`, `jurisdiction`, `topic_tags`, `role_relevance`, `has_fees`, `has_tmz`, `has_deadline`

### Role-Based Retrieval Filtering
Queries are pre-filtered by `doc_type` based on the active user role before semantic search:

| Role | Priority Doc Types |
|------|--------------------|
| Producer | permit_requirements, fee_schedule, union_rules |
| Location Manager | permit_requirements, fee_schedule, department_requirements, tmz_zone |
| Assistant Director | union_rules, permit_requirements, department_requirements |
| Director | tmz_zone, permit_requirements, union_rules |
| Production Designer | permit_requirements, department_requirements |

---

## Features Implemented

| Feature | Status |
|---------|--------|
| React group chat UI | ✅ Done |
| Multi-role switching (Director, Producer, AD, etc.) | ✅ Done |
| Image upload + drag-and-drop | ✅ Done |
| Real vision analysis on uploaded photos | ✅ Done |
| FastAPI backend | ✅ Done |
| ChromaDB persistent knowledge base (251 chunks) | ✅ Done |
| PDF ingestion pipeline (`ingest_docs.py`) | ✅ Done |
| Role-filtered RAG retrieval | ✅ Done |
| Rich chunk metadata (fees, TMZ, deadlines) | ✅ Done |
| Role-tailored AI responses | ✅ Done |
| Multi-turn conversation memory | ✅ Done |
| TMZ zone reference data | ✅ Done |
| GPS/address → TMZ lookup tool | ✅ Done |
| Hybrid TMZ boundary (contractual + geometric) | ✅ Done |
| Sun-path / golden hour calculator | ✅ Done |
| Real FilmLA permit fee data from source docs | ✅ Done |
| DGA union rules (rest periods, overtime, distant location) | ✅ Done |
| IATSE 2024 crew rules and per diem | ✅ Done |
| LAFD fire safety requirements | ✅ Done |
| LAPD noise enforcement rules | ✅ Done |
| Real FilmLA API integration | 🔜 Week 5 |
| Mobile app (Android TWA) | 🔜 Week 5-6 |
| User auth + persistent rooms | 🔜 Week 3-4 |
| Burbank / additional jurisdiction docs | 🔜 Next sprint |

---

## RAG Migration Note (Milestone 3)

The knowledge base was upgraded from **15 hardcoded text strings** to **251 chunks from 12 official PDF documents**.

### What changed
- `ingest_docs.py` — new ingestion pipeline using `pdfplumber` to extract and chunk all source PDFs
- `chromadb.Client()` (in-memory) → `chromadb.PersistentClient(path="./chroma_db")` (disk-persisted)
- Embedding model: ChromaDB default → `sentence-transformers/all-MiniLM-L6-v2` (consistent across ingestion and query)
- Collection: `film_knowledge` → `cinesync_knowledge`
- Query function now accepts `user_role` and pre-filters by `doc_type` metadata before semantic search
- System prompt now instructs the LLM to cite source documents in responses (e.g. "Per DGA Section 13-116...")

### Why it matters
Previously the AI was answering from hand-written summaries. Now it retrieves and cites verbatim content from the actual FilmLA, DGA, IATSE, LAFD, and LAPD documents — making every answer auditable and grounded in official sources.

---

## LLM Note

The project originally used **Llama 3.1 8B (Q4_K_M)** running locally via llama.cpp.
This was replaced with **OpenAI GPT-4o mini** for the following reasons:

- Local model required ~5GB storage and ran CPU-only on macOS 12 (very slow, 30–60s/response)
- GPT-4o mini responses come back in under 3 seconds
- GPT-4o mini supports **real vision/image analysis** for uploaded location photos
- Cost at class-project scale is negligible (< $1 total estimated)
- All RAG logic, ChromaDB embeddings, and FastAPI architecture remain unchanged

---

## Team
- **Arya Miryala** (Tech Lead) — Backend, RAG pipeline, AI integration, APIs
- **Grace Wu** (Business Lead) — Market strategy, pricing, interviews
- **Hui Xie** (Product Lead) — UI/UX, wireframes, frontend