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
MODEL             = "claude-3-5-sonnet-20241022"

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
SYSTEM_PROMPT = """You are a smart hotel recommendation assistant for Vietnam hotels.
You have access to a database with hotel data scraped from Booking.com.

Database schema (Athena SQL, database: hotel_data):
- dim_hotel(hotel_id, name, url, property_type, star_rating, checkin_time, checkout_time, description, primary_image, all_amenities, quality_score)
- dim_location(hotel_id, city, country, address, latitude, longitude, distance_from_center_m)
- dim_amenity(hotel_id, amenity)
- fact_pricing(hotel_id, price_per_night_vnd, original_price_vnd, discount_pct, taxes_included, price_tier, availability_status, availability_label, rooms_left, city, scrape_date)
- fact_review(hotel_id, rating_score, rating_label, review_count, rc_staff, rc_facilities, rc_cleanliness, rc_comfort, rc_value, rc_location, rc_wifi, quality_score, scrape_date)

Cities available: Ho Chi Minh City, Ha Noi, Da Nang, Hoi An, Nha Trang, Phu Quoc, Da Lat, Hue, Ha Long, Phan Thiet, Chau Doc, Dong Hoi, Dong Ha

Price tiers: budget (<500k VND), mid-range (500k-2M), premium (2M-5M), luxury (>5M)

IMPORTANT RULES:
1. Always use the LATEST data: add WHERE p.scrape_date = (SELECT MAX(scrape_date) FROM fact_pricing) for fact tables
2. Always JOIN dim_hotel h, dim_location l, fact_pricing p, fact_review r ON hotel_id
3. Limit results to 6-10 hotels unless user asks for more
4. For availability filter: WHERE p.availability_status = 'available'

You MUST respond in JSON format ONLY:
{
  "sql": "SELECT ... (your Athena SQL query, or null if no query needed)",
  "text": "Your friendly response to the user (in the same language as the user's message)",
  "needs_hotels": true/false
}

If the user asks about hotels, recommendations, prices, ratings → set needs_hotels: true and write SQL.
If general question → set needs_hotels: false, sql: null.
Always respond in the SAME language as the user's message (Vietnamese or English)."""


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
