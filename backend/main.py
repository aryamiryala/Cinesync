from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import chromadb
from chromadb.utils import embedding_functions
import requests
import os

OLLAMA_URL = "http://localhost:8001/v1/chat/completions"
OLLAMA_MODEL = "llama3"

app = FastAPI(title="Cinesync Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ChromaDB Setup ───────────────────────────────────────────────────────────
chroma_client = chromadb.Client()
embedding_fn = embedding_functions.DefaultEmbeddingFunction()
collection = chroma_client.get_or_create_collection(
    name="film_knowledge",
    embedding_function=embedding_fn
)


# ─── Knowledge Base Seeding ───────────────────────────────────────────────────
FILM_KNOWLEDGE = [
    # TMZ Zone
    {
        "text": "The Thirty Mile Zone (TMZ) is centered at Beverly Blvd & La Cienega Blvd in Los Angeles with a 30-mile radius. Inside the TMZ: no travel allowances required. Outside the TMZ: production must pay hotel accommodations and per diem of $125–200/day per crew member, adding $50K–$200K/week to budget.",
        "meta": {"category": "tmz", "topic": "TMZ Zone Definition"},
    },
    {
        "text": "TMZ Geographic Reference: INSIDE TMZ — Downtown LA, Santa Monica, Burbank, Pasadena, Culver City, Hollywood, West Hollywood, Glendale, Arcadia. OUTSIDE TMZ — Malibu, Long Beach, Anaheim, San Bernardino, Ventura. Always verify GPS coordinates against the official TMZ boundary map.",
        "meta": {"category": "tmz", "topic": "TMZ Geographic Landmarks"},
    },
    # Permits
    {
        "text": "FilmLA Permit Categories: Cat 1 (Minimal, <15 crew, no trucks): 1–2 day lead, ~$700 fee. Cat 2 (Low, 15–49 crew): 3–5 day lead, ~$1,200 fee. Cat 3 (Moderate, 50–149 crew): 5–10 day lead, ~$2,500 fee. Cat 4 (High Impact, 150+ crew): 10–20 day lead, ~$5,000+ fee, requires community notification.",
        "meta": {"category": "permits", "topic": "FilmLA Permit Categories and Lead Times"},
    },
    {
        "text": "FilmLA daily location fees: City streets $1,200–3,500/day. Public parks $500–2,000/day. Beaches $1,000–4,000/day. Government buildings $2,000–8,000/day. On-set LAPD officers $35–50/hr each. LAFD fire safety officers $45–65/hr. Traffic control officers $40–55/hr.",
        "meta": {"category": "permits", "topic": "FilmLA Permit Fees"},
    },
    # Noise
    {
        "text": "LA Noise Ordinance for Film: Permitted hours in RESIDENTIAL zones — Mon–Fri 7AM–10PM, Saturday 9AM–11PM, Sunday & holidays 10AM–11PM. Extended hours require a variance permit and written community notification 72 hours in advance. Generators must be baffled to 55 dB at the property line.",
        "meta": {"category": "noise", "topic": "Noise Ordinance Residential Hours"},
    },
    {
        "text": "Special Effects permits: All pyrotechnics require LAFD Fire Safety Officer on set. Smoke effects in buildings need separate LAFD permit. Gunshots/simulated gunfire require both FilmLA and LAPD permits. Fake rain effects may require storm drain permits from LA Sanitation.",
        "meta": {"category": "noise", "topic": "Special Effects and Pyrotechnics"},
    },
    # Logistics
    {
        "text": "Production vehicle logistics: Standard production semi-trucks are 53ft. Location streets need min 14ft height clearance, 12ft width clearance. Residential street weight limit typically 3 tons; commercial/downtown streets handle up to 80,000 lbs. Basecamp must be within 1 mile of set. Large productions need 10–30 truck parking spaces.",
        "meta": {"category": "logistics", "topic": "Production Vehicle Access"},
    },
    {
        "text": "LAFD access requirements: Emergency vehicle lanes must remain clear at minimum 20ft width at all times during filming. Any street closure requires LAPD traffic control. Hydrant clearance: 15ft minimum. No production equipment within 10ft of fire department connections.",
        "meta": {"category": "logistics", "topic": "LAFD Safety Requirements"},
    },
    # Union Rules
    {
        "text": "DGA Rules: Director requires minimum 12-hour turnaround between shooting days. AD must be on set whenever cameras roll. Director must be notified of location changes 48 hours in advance. Any location within TMZ does not trigger location premium pay. Outside TMZ: $50 location premium per crew member per day.",
        "meta": {"category": "union", "topic": "DGA Director Rules"},
    },
    {
        "text": "IATSE Local 44 (Art Department): Location survey required 72 hours before shoot day. Any location modification (painting walls, removing fixtures) requires written owner consent. Restoration bond typically 10–20% of location fee. Scenic artists have a 10-hour minimum call.",
        "meta": {"category": "union", "topic": "IATSE Art Department Rules"},
    },
    # LA Locations
    {
        "text": "Downtown LA (DTLA): INSIDE TMZ. Book streets 3+ weeks in advance. Popular for urban/corporate/futuristic scenes. Key sub-zones: Arts District (industrial/brick aesthetic, lower permit cost), Financial District (corporate glass towers, higher permit), Historic Core (vintage buildings, 1920s–40s look). LAPD film detail required for any street closure.",
        "meta": {"category": "locations", "topic": "Downtown LA Filming"},
    },
    {
        "text": "Venice Beach: INSIDE TMZ. Boardwalk requires separate LA Parks permit in addition to FilmLA. Ocean Front Walk fee: $2,000–5,000/day. Venice Canals available for intimate/residential scenes. Very limited truck parking — must pre-arrange with FilmLA designated lots. Background control team usually required for boardwalk scenes.",
        "meta": {"category": "locations", "topic": "Venice Beach Filming"},
    },
    {
        "text": "Griffith Park: LA Recreation & Parks permit required IN ADDITION to FilmLA. Observatory area: no cranes or camera dollies on paved paths. Golden hour/magic hour slots heavily competed — book 4+ weeks ahead. Trail areas require crew to pack in all equipment. No generators in park — must use battery/hybrid alternatives.",
        "meta": {"category": "locations", "topic": "Griffith Park Filming"},
    },
    {
        "text": "Malibu & Pacific Coast Highway: OUTSIDE TMZ — triggers full crew travel pay and per diem. California Coastal Commission permit required for any beach scenes in addition to FilmLA. PCH closures require Caltrans approval minimum 3 weeks. Environmental compliance required for any production within 100ft of ocean.",
        "meta": {"category": "locations", "topic": "Malibu Filming"},
    },
    # Sun/Light
    {
        "text": "Sun position and natural light for LA filming: Golden hour (sunrise) typically 6:30–7:30 AM. Golden hour (sunset) typically 5:30–7:00 PM depending on season. Magic hour lasts approximately 20–40 minutes. For west-facing locations, best natural light is late afternoon 3–6 PM. For east-facing, best is morning 7–10 AM. North-facing gives consistent diffused light all day.",
        "meta": {"category": "creative", "topic": "Natural Light and Sun Position"},
    },
]


def seed_knowledge_base():
    if collection.count() == 0:
        texts = [d["text"] for d in FILM_KNOWLEDGE]
        metas = [d["meta"] for d in FILM_KNOWLEDGE]
        ids = [f"doc_{i}" for i in range(len(texts))]
        collection.add(documents=texts, metadatas=metas, ids=ids)
        print(f"Seeded {len(texts)} documents into ChromaDB")
    else:
        print(f"ChromaDB already has {collection.count()} documents")


def query_knowledge_base(query: str, n_results: int = 4) -> List[str]:
    results = collection.query(query_texts=[query], n_results=n_results)
    return results["documents"][0] if results["documents"] else []


# ─── Models ───────────────────────────────────────────────────────────────────
class Message(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    user_role: str = "Location Manager"  # Director, Producer, AD, Location Manager, Production Designer
    image_base64: Optional[str] = None
    image_media_type: Optional[str] = "image/jpeg"
    conversation_history: Optional[List[Message]] = []


class ChatResponse(BaseModel):
    response: str
    rag_sources_used: int


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    seed_knowledge_base()


@app.get("/health")
def health_check():
    return {"status": "ok", "knowledge_docs": collection.count()}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # 1. RAG: Retrieve relevant context
    context_docs = query_knowledge_base(req.message)
    context = "\n\n---\n\n".join(context_docs)

    # 2. Build role-tailored system prompt
    role_focus = {
        "Director": "Focus on creative feasibility: lighting, aesthetic, visual constraints, and scene potential.",
        "Producer": "Emphasize budget impact, permit costs, TMZ status affecting crew pay, and timeline risks.",
        "Location Manager": "Provide detailed permit requirements, lead times, ordinances, and logistics.",
        "Production Designer": "Focus on visual characteristics, modification possibilities, and restoration requirements.",
        "Assistant Director (AD)": "Emphasize scheduling constraints, crew call times, turnaround rules, and safety.",
    }
    role_instruction = role_focus.get(req.user_role, "Provide a balanced overview of all considerations.")

    system_prompt = f"""You are CinesyncAI, the AI expert embedded in a film production group chat called Cinesync. You are a compliance auditor, location analyst, and production logistics expert for Los Angeles film productions.

KNOWLEDGE BASE CONTEXT (retrieved via RAG):
{context}

YOUR ROLE: Act as the shared source of truth for the production team. Give structured, actionable answers.

RESPONSE FORMAT — always use this structure when relevant:
📍 **LOCATION ASSESSMENT** — TMZ status, jurisdiction
⏱️ **PERMIT REQUIREMENTS** — Category, lead time, estimated cost  
💰 **BUDGET IMPACT** — Cost estimates, union implications
⚠️ **FLAGS & RISKS** — Any compliance issues, noise, logistics
🎬 **CREATIVE NOTES** — Light, aesthetic, scene potential
🚛 **LOGISTICS** — Parking, truck access, basecamp

Only include sections relevant to the question. Be specific with numbers.

CURRENT USER ROLE: {req.user_role}
{role_instruction}

If an image is provided, visually assess it: identify setting type (urban/residential/industrial/natural), estimate crew access, flag any visible compliance concerns."""

    # 3. Build messages for Ollama (image note: llama3 text-only, image is described in text)
    messages = [{"role": "system", "content": system_prompt}]
    for hist_msg in (req.conversation_history or []):
        messages.append({"role": hist_msg.role, "content": hist_msg.content})

    user_content = req.message
    if req.image_base64:
        user_content = "[User uploaded a location photo] " + req.message

    messages.append({"role": "user", "content": user_content})

    # 4. Call llama.cpp server (OpenAI-compatible)
    try:
        res = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "messages": messages,
            "stream": False,
        }, timeout=120)
        res.raise_for_status()
        reply = res.json()["choices"][0]["message"]["content"]
        return ChatResponse(response=reply, rag_sources_used=len(context_docs))
    except requests.exceptions.ConnectionError:
        raise HTTPException(status_code=500, detail="Cannot connect to llama.cpp server. Make sure it's running on port 8001.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
