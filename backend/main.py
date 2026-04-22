"""
Hotel Chatbot — FastAPI Backend
================================
Endpoints:
  POST /chat   → nhận user message, query Athena, trả về {text, hotels}
  GET  /health → health check
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import boto3
import anthropic
import json
import time
import os
from typing import Optional

app = FastAPI(title="Hotel Chatbot API")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict to your domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ────────────────────────────────────────────────────────────────────
AWS_REGION        = os.getenv("AWS_REGION", "ap-southeast-1")
ATHENA_DB         = os.getenv("ATHENA_DB", "hotel_data")
ATHENA_OUTPUT     = os.getenv("ATHENA_OUTPUT", "s3://booking-athena-results-yourname/")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MODEL             = "claude-sonnet-4-20250514"

# ── Clients ───────────────────────────────────────────────────────────────────
athena_client  = boto3.client("athena", region_name=AWS_REGION)
claude_client  = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── Models ────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    history: list = []   # [{role: "user"|"assistant", content: "..."}]
    language: str = "vi" # "vi" | "en"

class Hotel(BaseModel):
    hotel_id: str
    name: str
    city: str
    address: Optional[str]
    price_per_night_vnd: Optional[int]
    price_tier: Optional[str]
    rating_score: Optional[float]
    rating_label: Optional[str]
    review_count: Optional[int]
    star_rating: Optional[int]
    primary_image: Optional[str]
    description: Optional[str]
    availability_label: Optional[str]
    distance_from_center_m: Optional[int]
    url: Optional[str]
    discount_pct: Optional[float]

class ChatResponse(BaseModel):
    text: str
    hotels: list[Hotel] = []
    sql: Optional[str] = None

# ── Athena helpers ────────────────────────────────────────────────────────────
def run_athena_query(sql: str) -> list[dict]:
    """Execute SQL on Athena, return list of row dicts."""
    response = athena_client.start_query_execution(
        QueryString=sql,
        QueryExecutionContext={"Database": ATHENA_DB},
        ResultConfiguration={"OutputLocation": ATHENA_OUTPUT},
    )
    execution_id = response["QueryExecutionId"]

    # Poll until done (max 30s)
    for _ in range(30):
        time.sleep(1)
        status = athena_client.get_query_execution(
            QueryExecutionId=execution_id
        )["QueryExecution"]["Status"]["State"]

        if status == "SUCCEEDED":
            break
        elif status in ("FAILED", "CANCELLED"):
            error = athena_client.get_query_execution(
                QueryExecutionId=execution_id
            )["QueryExecution"]["Status"].get("StateChangeReason", "Unknown")
            raise Exception(f"Athena query failed: {error}")

    # Fetch results
    results = athena_client.get_query_results(QueryExecutionId=execution_id)
    rows    = results["ResultSet"]["Rows"]
    if len(rows) < 2:
        return []

    headers = [c["VarCharValue"] for c in rows[0]["Data"]]
    return [
        {headers[i]: col.get("VarCharValue") for i, col in enumerate(row["Data"])}
        for row in rows[1:]
    ]


def rows_to_hotels(rows: list[dict]) -> list[Hotel]:
    """Convert Athena rows to Hotel objects."""
    hotels = []
    for r in rows:
        try:
            hotels.append(Hotel(
                hotel_id             = r.get("hotel_id", ""),
                name                 = r.get("name", ""),
                city                 = r.get("city", ""),
                address              = r.get("address"),
                price_per_night_vnd  = int(r["price_per_night_vnd"]) if r.get("price_per_night_vnd") else None,
                price_tier           = r.get("price_tier"),
                rating_score         = float(r["rating_score"]) if r.get("rating_score") else None,
                rating_label         = r.get("rating_label"),
                review_count         = int(r["review_count"]) if r.get("review_count") else None,
                star_rating          = int(r["star_rating"]) if r.get("star_rating") else None,
                primary_image        = r.get("primary_image"),
                description          = r.get("description"),
                availability_label   = r.get("availability_label"),
                distance_from_center_m = int(r["distance_from_center_m"]) if r.get("distance_from_center_m") else None,
                url                  = r.get("url"),
                discount_pct         = float(r["discount_pct"]) if r.get("discount_pct") else None,
            ))
        except Exception:
            continue
    return hotels


# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an expert hotel recommendation assistant for Vietnam hotels, with deep knowledge of the hotel database scraped from Booking.com.

## DATABASE SCHEMA (Athena SQL, database: hotel_data)

### dim_hotel
hotel_id, name, url, property_type, star_rating, checkin_time, checkout_time, description, primary_image, all_amenities (array - DO NOT USE FOR FILTERING), quality_score

### dim_location  
hotel_id, city, country, address, latitude, longitude, distance_from_center_m

### dim_amenity (USE THIS for amenity filtering)
hotel_id, amenity (values like: outdoor_swimming_pool, free_wifi, breakfast, free_parking, spa, beachfront, airport_shuttle, family_rooms, restaurant, bar, non_smoking_rooms, room_service, private_beach_area, fitness_center, free_breakfast)

### fact_pricing (partitioned by scrape_date STRING)
hotel_id, price_per_night_vnd, original_price_vnd, discount_pct, taxes_included, price_tier (budget/mid-range/premium/luxury), availability_status, availability_label, rooms_left, city, scrape_date

### fact_review (partitioned by scrape_date STRING)
hotel_id, rating_score (0-10), rating_label (Good/Very Good/Excellent/Exceptional), review_count, rc_staff, rc_facilities, rc_cleanliness, rc_comfort, rc_value, rc_location, rc_wifi, quality_score, scrape_date

## CITIES AVAILABLE
Ho Chi Minh City, Ha Noi, Da Nang, Hoi An, Nha Trang, Phu Quoc, Da Lat, Hue, Ha Long, Phan Thiet, Chau Doc, Dong Hoi, Dong Ha, Cat Ba, Ninh Binh, Sa Pa, Vung Tau, Mui Ne, Quy Nhon, Hai Phong

## CRITICAL SQL RULES

### 1. ALWAYS get latest data per hotel using subquery:
JOIN (SELECT hotel_id, MAX(scrape_date) as max_date FROM hotel_data.fact_pricing GROUP BY hotel_id) lp ON p.hotel_id = lp.hotel_id AND p.scrape_date = lp.max_date
JOIN (SELECT hotel_id, MAX(scrape_date) as max_date FROM hotel_data.fact_review GROUP BY hotel_id) lr ON r.hotel_id = lr.hotel_id AND r.scrape_date = lr.max_date

### 2. AMENITY FILTERING - ALWAYS use dim_amenity table with LIKE (NEVER use all_amenities array):
JOIN hotel_data.dim_amenity a ON h.hotel_id = a.hotel_id AND LOWER(a.amenity) LIKE '%pool%'
Use: pool, breakfast, spa, wifi, beach, parking, gym, fitness, shuttle, restaurant, bar

### 3. PRICE: use WHERE p.price_per_night_vnd < X, ORDER BY price ASC/DESC. NEVER filter by price_tier.

### 4. RATING: WHERE r.rating_score >= X, ORDER BY r.rating_score DESC

### 5. LOCATION: distance_from_center_m < 2000 for central, JOIN dim_amenity LIKE '%beach%' for beachfront

### 6. FOLLOW-UP QUERIES: When user asks follow-up ("cai nao co ho boi?", "cai nao re nhat?"), extract hotel_ids from previous results in conversation and add: WHERE h.hotel_id IN ('id1', 'id2', ...)

### 7. STANDARD SELECT (always include these fields):
SELECT h.hotel_id, h.name, h.url, h.star_rating, h.property_type, h.description, h.primary_image, h.checkin_time, h.checkout_time, l.city, l.address, l.distance_from_center_m, p.price_per_night_vnd, p.original_price_vnd, p.discount_pct, p.price_tier, p.availability_status, p.availability_label, p.rooms_left, r.rating_score, r.rating_label, r.review_count, r.rc_staff, r.rc_cleanliness, r.rc_facilities, r.rc_comfort, r.rc_value, r.rc_location

## RESPONSE FORMAT - JSON ONLY:
{"sql": "Athena SQL or null", "text": "response in user language", "needs_hotels": true/false}

## RULES
- Always respond in same language as user (Vietnamese/English)
- For Vietnamese: friendly tone, use anh/chi
- For hotel detail questions: provide rich info from description, ratings breakdown, amenities - do not just link to Booking.com
- Limit: 8 hotels default, 10 max unless user asks for more
- Always filter: WHERE p.availability_status = 'available'"""


# ── Chat endpoint ─────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    # Build message history for Claude
    messages = req.history + [{"role": "user", "content": req.message}]

    # Step 1: Ask Claude to generate SQL + response text
    claude_resp = claude_client.messages.create(
        model      = MODEL,
        max_tokens = 1024,
        system     = SYSTEM_PROMPT,
        messages   = messages,
    )

    raw = claude_resp.content[0].text.strip()

    # Parse JSON response from Claude
    try:
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return ChatResponse(text=raw, hotels=[])

    text        = parsed.get("text", "")
    sql         = parsed.get("sql")
    needs_hotels = parsed.get("needs_hotels", False)

    # Step 2: Run Athena query if needed
    hotels = []
    if needs_hotels and sql:
        try:
            rows   = run_athena_query(sql)
            hotels = rows_to_hotels(rows)
        except Exception as e:
            text += f"\n\n_(Lỗi truy vấn dữ liệu: {str(e)})_"

    return ChatResponse(text=text, hotels=hotels, sql=sql)


@app.get("/health")
def health():
    return {"status": "ok"}
