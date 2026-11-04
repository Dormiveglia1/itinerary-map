"""Settings read from environment variables (and src/backend/.env if present)."""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:  # python-dotenv is optional; plain env vars still work
    pass

# Server key: Places API (New) + Routes API. Never sent to the frontend (NFR-S3).
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")

# Frontend origins allowed to call this API from the browser.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
    if o.strip()
]

# Python module (under src/) that exposes generate_itinerary(trip, pois, travel_times).
OPTIMIZER_MODULE = os.getenv("OPTIMIZER_MODULE", "optimization")

GOOGLE_TIMEOUT_SEC = float(os.getenv("GOOGLE_TIMEOUT_SEC", "15"))
