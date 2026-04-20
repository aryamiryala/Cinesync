from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import chromadb
from chromadb.utils import embedding_functions
from llm_client import call_llm, call_llm_with_history, call_llm_with_image
import math
import urllib.request
import urllib.parse
import json
from datetime import date, datetime
from astral import LocationInfo
from astral.sun import sun

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

# ─── TMZ Constants ────────────────────────────────────────────────────────────
# TMZ center: Beverly Blvd & La Cienega Blvd, Los Angeles
TMZ_CENTER_LAT = 34.0803
TMZ_CENTER_LON = -118.3603
TMZ_RADIUS_MILES = 30.0

# The TMZ boundary is a contractual definition, not a perfect geometric circle.
# Some areas (e.g. Malibu) are geographically within 30 miles but are
# contractually OUTSIDE TMZ. This lookup table overrides the math for known cases.
KNOWN_OUTSIDE_TMZ = {
    'malibu', 'long beach', 'anaheim', 'santa ana', 'irvine', 'orange',
    'ventura', 'oxnard', 'thousand oaks', 'simi valley', 'moorpark',
    'lancaster', 'palmdale', 'santa clarita', 'valencia',
    'san bernardino', 'riverside', 'ontario', 'rancho cucamonga',
    'fontana', 'moreno valley', 'corona', 'pomona',
    'san diego', 'bakersfield', 'santa barbara', 'palm springs',
    'victorville', 'hesperia', 'apple valley', 'big bear',
    'lake arrowhead', 'catalina', 'avalon',
}

KNOWN_INSIDE_TMZ = {
    'los angeles', 'santa monica', 'burbank', 'pasadena', 'culver city',
    'hollywood', 'west hollywood', 'glendale', 'arcadia', 'torrance',
    'el segundo', 'manhattan beach', 'hermosa beach', 'redondo beach',
    'inglewood', 'hawthorne', 'gardena', 'compton', 'downey', 'whittier',
    'van nuys', 'north hollywood', 'sherman oaks', 'encino', 'chatsworth',
    'northridge', 'san fernando', 'studio city', 'silver lake', 'echo park',
    'el monte', 'monrovia', 'azusa', 'covina', 'west covina',
    'alhambra', 'san gabriel', 'temple city', 'rosemead', 'baldwin park',
    'beverly hills', 'bel air', 'brentwood', 'pacific palisades',
    'koreatown', 'downtown', 'arts district', 'boyle heights',
}


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in miles between two GPS coordinates."""
    R = 3958.8  # Earth radius in miles
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def check_tmz_status(resolved_address: str, distance_miles: float) -> bool:
    """
    Hybrid TMZ check: city lookup table takes priority over geometry.
    The TMZ is a contractual boundary, not a perfect 30-mile circle.
    """
    addr_lower = resolved_address.lower()

    # Check known outside cities first
    for city in KNOWN_OUTSIDE_TMZ:
        if city in addr_lower:
            return False  # outside TMZ

    # Check known inside cities
    for city in KNOWN_INSIDE_TMZ:
        if city in addr_lower:
            return True  # inside TMZ

    # Fall back to geometry for unknown locations
    return distance_miles <= TMZ_RADIUS_MILES


def geocode_address(address: str):
    """Convert address string to lat/lon using OpenStreetMap Nominatim (free, no API key)."""
    params = urllib.parse.urlencode({'q': address, 'format': 'json', 'limit': 1})
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Cinesync/1.0 (class project)'})
    with urllib.request.urlopen(req, timeout=10) as response:
        data = json.loads(response.read())
        if data:
            return float(data[0]['lat']), float(data[0]['lon']), data[0].get('display_name', address)
    return None, None, None


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
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    user_role: str = "Location Manager"
    image_base64: Optional[str] = None
    image_media_type: Optional[str] = "image/jpeg"
    conversation_history: Optional[List[Message]] = []


class ChatResponse(BaseModel):
    response: str
    rag_sources_used: int


class TmzLookupRequest(BaseModel):
    address: str
    crew_size: Optional[int] = 50  # for budget impact estimate


class TmzLookupResponse(BaseModel):
    address: str
    resolved_address: str
    latitude: float
    longitude: float
    distance_miles: float
    inside_tmz: bool
    status_label: str        # "INSIDE TMZ" or "OUTSIDE TMZ"
    miles_from_boundary: float  # positive = inside, negative = outside
    budget_impact: str
    union_implications: str


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    seed_knowledge_base()


@app.get("/health")
def health_check():
    return {"status": "ok", "knowledge_docs": collection.count()}


@app.post("/api/tmz-lookup", response_model=TmzLookupResponse)
async def tmz_lookup(req: TmzLookupRequest):
    """
    Takes any address, geocodes it, and returns TMZ status + budget implications.
    Uses OpenStreetMap Nominatim — free, no API key required.
    """
    try:
        lat, lon, resolved = geocode_address(req.address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding failed: {str(e)}")

    if lat is None:
        raise HTTPException(status_code=404, detail=f"Could not find location: {req.address}")

    distance = haversine_miles(TMZ_CENTER_LAT, TMZ_CENTER_LON, lat, lon)
    inside = check_tmz_status(resolved, distance)
    miles_from_boundary = round(TMZ_RADIUS_MILES - distance, 2)  # positive=inside, negative=outside

    crew = req.crew_size or 50

    if inside:
        budget_impact = "No travel allowances required. Crew works under standard local rates."
        union_implications = (
            f"No location premium triggered. No per diem required. "
            f"Estimated crew cost savings vs. outside TMZ: "
            f"${crew * 150:,}–${crew * 200:,}/week."
        )
    else:
        daily_perdiem_low = crew * 125
        daily_perdiem_high = crew * 200
        weekly_low = daily_perdiem_low * 5
        weekly_high = daily_perdiem_high * 5
        budget_impact = (
            f"OUTSIDE TMZ triggers full travel pay. "
            f"Per diem: ${daily_perdiem_low:,}–${daily_perdiem_high:,}/day for {crew} crew. "
            f"Weekly additional cost: ${weekly_low:,}–${weekly_high:,}. "
            f"Hotel accommodations required on top of per diem."
        )
        union_implications = (
            f"DGA/IATSE location premium: $50/crew member/day = ${crew * 50:,}/day. "
            f"AD must notify Director of location status 48 hrs in advance."
        )

    return TmzLookupResponse(
        address=req.address,
        resolved_address=resolved,
        latitude=round(lat, 6),
        longitude=round(lon, 6),
        distance_miles=round(distance, 2),
        inside_tmz=inside,
        status_label="INSIDE TMZ" if inside else "OUTSIDE TMZ",
        miles_from_boundary=abs(miles_from_boundary),
        budget_impact=budget_impact,
        union_implications=union_implications,
    )


class SunPathRequest(BaseModel):
    address: str
    shoot_date: Optional[str] = None  # ISO format YYYY-MM-DD, defaults to today


class SunPathResponse(BaseModel):
    address: str
    resolved_address: str
    latitude: float
    longitude: float
    shoot_date: str
    dawn: str
    sunrise: str
    golden_hour_morning_start: str
    golden_hour_morning_end: str
    solar_noon: str
    golden_hour_evening_start: str
    golden_hour_evening_end: str
    sunset: str
    dusk: str
    total_daylight_hours: float
    shooting_windows: List[dict]   # [{label, start, end, direction, notes}]


@app.post("/api/sun-path", response_model=SunPathResponse)
async def sun_path(req: SunPathRequest):
    """
    Returns sun times + golden hour windows for any address and date.
    Uses the astral library — no external API needed.
    """
    try:
        lat, lon, resolved = geocode_address(req.address)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding failed: {str(e)}")

    if lat is None:
        raise HTTPException(status_code=404, detail=f"Could not find location: {req.address}")

    try:
        shoot_date = date.fromisoformat(req.shoot_date) if req.shoot_date else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    loc = LocationInfo(
        name=resolved[:40],
        region="CA",
        timezone="America/Los_Angeles",
        latitude=lat,
        longitude=lon,
    )

    s = sun(loc.observer, date=shoot_date, tzinfo=loc.timezone)

    # Calculate golden hours manually from sunrise/sunset — more reliable than
    # astral's golden_hour() which can return inconsistent results across versions.
    # Morning golden hour: 30 min before sunrise → 1 hour after sunrise
    # Evening golden hour: 1 hour before sunset → 30 min after sunset
    from datetime import timedelta
    gh_morning_start = s["sunrise"] - timedelta(minutes=30)
    gh_morning_end   = s["sunrise"] + timedelta(hours=1)
    gh_evening_start = s["sunset"]  - timedelta(hours=1)
    gh_evening_end   = s["sunset"]  + timedelta(minutes=30)

    fmt = lambda dt: dt.strftime("%I:%M %p")

    daylight = (s["sunset"] - s["sunrise"]).seconds / 3600

    shooting_windows = [
        {
            "label": "Morning Golden Hour",
            "start": fmt(gh_morning_start),
            "end": fmt(gh_morning_end),
            "direction": "East-facing",
            "notes": "Warm low-angle light. Best for east-facing exteriors. Shadows long and dramatic.",
            "type": "golden"
        },
        {
            "label": "Midday Overcast Safe Zone",
            "start": fmt(s["sunrise"]),
            "end": fmt(s["noon"]),
            "direction": "Any facing",
            "notes": "Consistent diffused light on overcast days. Harsh direct sun midday — use diffusion.",
            "type": "neutral"
        },
        {
            "label": "Evening Golden Hour",
            "start": fmt(gh_evening_start),
            "end": fmt(gh_evening_end),
            "direction": "West-facing",
            "notes": "Peak cinematic light. Best for west-facing exteriors. 30–40 min magic hour window.",
            "type": "golden"
        },
        {
            "label": "Blue Hour",
            "start": fmt(s["sunset"]),
            "end": fmt(s["dusk"]),
            "direction": "Any facing",
            "notes": "Cool blue ambient light, no direct sun. Great for moody urban scenes. ~20 min window.",
            "type": "blue"
        },
    ]

    return SunPathResponse(
        address=req.address,
        resolved_address=resolved,
        latitude=round(lat, 6),
        longitude=round(lon, 6),
        shoot_date=shoot_date.isoformat(),
        dawn=fmt(s["dawn"]),
        sunrise=fmt(s["sunrise"]),
        golden_hour_morning_start=fmt(gh_morning_start),
        golden_hour_morning_end=fmt(gh_morning_end),
        solar_noon=fmt(s["noon"]),
        golden_hour_evening_start=fmt(gh_evening_start),
        golden_hour_evening_end=fmt(gh_evening_end),
        sunset=fmt(s["sunset"]),
        dusk=fmt(s["dusk"]),
        total_daylight_hours=round(daylight, 1),
        shooting_windows=shooting_windows,
    )



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

    # 3. Build conversation history
    history = [{"role": m.role, "content": m.content} for m in (req.conversation_history or [])]

    # 4. Call OpenAI — vision route if image attached, otherwise text
    try:
        if req.image_base64:
            reply = call_llm_with_image(
                system_prompt=system_prompt,
                user_message=req.message,
                messages=history,
                image_base64=req.image_base64,
                mime_type=req.image_media_type or "image/jpeg"
            )
        elif history:
            reply = call_llm_with_history(
                system_prompt=system_prompt,
                messages=[*history, {"role": "user", "content": req.message}]
            )
        else:
            reply = call_llm(
                system_prompt=system_prompt,
                user_message=req.message
            )

        return ChatResponse(response=reply, rag_sources_used=len(context_docs))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))