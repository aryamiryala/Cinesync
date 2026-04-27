# CinesyncAI — Film Location Intelligence
### DSCI-560 Capstone · Team StandAI · Group #3

A domain-specific AI group chat system for film production location management. Production teams get instant, source-cited compliance answers about filming locations — covering TMZ zone status, FilmLA permits, noise ordinances, union rules, LAFD requirements, and crew logistics.

**Stack:** RAG (ChromaDB + 12 real PDFs) · GPT-4o mini (OpenAI) · FastAPI · React · PWA

---

## Quick Start (Local Demo)

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key

---

### 1. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

pip install -r requirements.txt
```

Create a `.env` file in `backend/`:
```
OPENAI_API_KEY=sk-...
```

**Seed the knowledge base (run once before first launch):**
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

```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

---

## Demo Flow

1. **Open** http://localhost:3000 — the chat pre-loads with an active location scouting conversation including an AI-generated map of the Arts District
2. **Switch role** to "Producer" using the dropdown (top right)
3. **Ask:** *"I'm filming at Griffith Observatory on a Saturday with 80 crew members, including pyrotechnics. What do I need and what will it cost?"*
   - Watch it pull the Wednesday 10am permit deadline, $78 Special FX admin fee, and $44.50/hr monitor fee from actual FilmLA PDFs — and generate a live map of the location
4. **Switch role** to "Location Manager"
5. **Upload** a location photo (📎 button) and ask: *"Can we film here? Analyze for compliance."*
   - GPT-4o mini performs real visual analysis of the uploaded image
6. **Switch role** to "Director" and ask: *"What time is golden hour at Venice Beach this weekend?"*
7. **Click ☀️ SUN PATH** in the sidebar — enter any LA address to get golden hour windows, blue hour, and shooting window recommendations with an arc diagram
8. **Click 📍 TMZ LOOKUP** — compare Griffith Observatory (inside TMZ, no travel pay) vs Malibu (outside TMZ, ~$7,500–$12,000/day in per diem for 60 crew)
9. **On mobile** — tap the hamburger menu (☰) to access the sidebar; the app is installable as a PWA via Chrome's "Add to Home Screen"

---

## Architecture

```
User (React Frontend PWA, port 3000)
        │  HTTP POST /api/chat
        │  HTTP POST /api/tmz-lookup
        │  HTTP POST /api/sun-path
        ▼
FastAPI Backend (port 8000)
        │
        ├─ ChromaDB (Persistent, ./chroma_db)
        │   └─ Role-filtered semantic search (top-6 chunks)
        │       251 chunks · 12 official PDFs
        │       sentence-transformers/all-MiniLM-L6-v2 embeddings
        │       Metadata: doc_type · jurisdiction · role_relevance
        │       has_fees · has_tmz · has_deadline flags
        │
        ├─ OpenStreetMap Nominatim (geocoding, free, no API key)
        │   └─ Address → lat/lon for TMZ calc, map generation, sun path
        │
        ├─ OpenStreetMap Embed (live interactive maps in chat, free)
        │   └─ AI appends map iframe to responses when location detected
        │
        ├─ Astral library (sun position calculations, local)
        │   └─ Precise golden hour / blue hour for any location + date
        │
        └─ OpenAI API (GPT-4o mini)
                - Text: RAG context + role-tailored system prompt
                - Vision: real image analysis on uploaded location photos
                - Returns: structured compliance report with source citations
```

---

## Knowledge Base — Official Source Documents

The RAG system is built from **12 real authoritative documents** (251 chunks).
Ingested via `ingest_docs.py` into a persistent ChromaDB collection on disk.

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
- Target chunk size: ~1,800 characters with 200-character overlap
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
| Multi-role switching (Director, Producer, Location Manager, AD, PD) | ✅ Done |
| Image upload + drag-and-drop | ✅ Done |
| Real vision analysis on uploaded location photos (GPT-4o mini) | ✅ Done |
| FastAPI backend | ✅ Done |
| ChromaDB persistent knowledge base (251 chunks, 12 docs) | ✅ Done |
| PDF ingestion pipeline (`ingest_docs.py`) | ✅ Done |
| Section-aware chunking with rich metadata | ✅ Done |
| Role-filtered semantic RAG retrieval | ✅ Done |
| Source-cited AI responses (per FilmLA / per DGA Section...) | ✅ Done |
| Role-tailored system prompts per user role | ✅ Done |
| Multi-turn conversation memory | ✅ Done |
| TMZ zone lookup — GPS/address → zone status | ✅ Done |
| Hybrid TMZ boundary (contractual lookup + geometric haversine) | ✅ Done |
| TMZ budget impact calculator (per diem, hotel, union premium) | ✅ Done |
| Sun Path Analyzer — golden hour, blue hour, shooting windows | ✅ Done |
| Sun path arc diagram (SVG, interactive) | ✅ Done |
| AI-generated location maps in chat (OpenStreetMap embed iframes) | ✅ Done |
| Location detection from natural language messages (regex) | ✅ Done |
| Mobile-responsive layout (hamburger drawer on mobile) | ✅ Done |
| PWA (Progressive Web App) — installable via Chrome | ✅ Done |
| Service worker + web manifest | ✅ Done |
| Real FilmLA permit fee data from source PDFs | ✅ Done |
| DGA union rules (rest periods, overtime, distant location) | ✅ Done |
| IATSE 2024 crew rules and per diem | ✅ Done |
| LAFD fire safety requirements | ✅ Done |
| LAPD noise enforcement rules | ✅ Done |

---

## Milestone Summary

### Milestone 1 — Foundation
- FastAPI backend, React frontend, ChromaDB in-memory
- 15 hardcoded knowledge strings, basic RAG retrieval
- Multi-role UI, image upload, llama.cpp local LLM

### Milestone 2 — Core System
- Switched from llama.cpp → GPT-4o mini (vision support, 10x faster)
- TMZ lookup tool with haversine + contractual boundary logic
- Budget impact and union implication calculations
- Multi-turn conversation memory

### Milestone 3 — Real Data
- Replaced 15 hardcoded strings with 251 chunks from 12 real official PDFs
- `ingest_docs.py` ingestion pipeline with section-aware chunking
- ChromaDB in-memory → PersistentClient (disk-persisted)
- Role-filtered retrieval by doc_type metadata
- Source citations in AI responses
- Sun Path Analyzer with arc diagram and shooting windows

### Milestone 4 — Polish & Completion
- AI-generated location maps embedded in chat responses (OpenStreetMap iframes)
- Location name extraction from natural language messages
- Mobile-responsive layout with slide-out sidebar drawer
- PWA implementation (installable as mobile app, satisfies "App" requirement)
- Service worker with network-first caching strategy
- Web app manifest with theme color and icons

---

## Project Requirements Checklist

| Requirement | Implementation |
|-------------|---------------|
| Real-world problem with existing profitable solutions | Film production location compliance — Cineapse, Movie Magic, FilmLA ($1.35B market) |
| 9+ human interviews | Conducted with Location Managers, ADs, Producers (recordings in demo video) |
| Web interface | React chat UI at localhost:3000 |
| App | PWA installable via Chrome "Add to Home Screen" |
| File/picture upload | 📎 button + drag-and-drop, analyzed by GPT-4o mini vision |
| AI uses embeddings | ChromaDB with sentence-transformers/all-MiniLM-L6-v2 |
| AI agent displays pictures | OpenStreetMap embed maps generated in AI responses |

---

## LLM Migration History

**Milestone 1:** Llama 3.1 8B (Q4_K_M) via llama.cpp — CPU-only on macOS 12, 30–60s per response, no vision support.

**Milestone 2+:** GPT-4o mini via OpenAI API — responses in under 3 seconds, real vision analysis on uploaded photos, cost negligible at class-project scale (< $2 total estimated).

All RAG logic, ChromaDB embeddings, and FastAPI architecture unchanged across the migration.

---

## Team
- **Arya Miryala** (Tech Lead) — Backend, RAG pipeline, PDF ingestion, AI integration, TMZ engine, Sun Path, map generation, PWA, mobile layout
- **Grace Wu** (Business Lead) — Market strategy, pricing, competitive analysis, user interviews, willingness-to-pay research
- **Hui Xie** (Product Lead) — UI/UX design, wireframes, frontend implementation, user workflow design