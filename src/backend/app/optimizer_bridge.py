"""Calls the optimization module: generate_itinerary(trip, pois, travel_times)."""

import importlib
import sys
from pathlib import Path

from . import config
from .errors import APIError

SRC_DIR = Path(__file__).resolve().parents[2]  # .../src


def _load():
    if str(SRC_DIR) not in sys.path:
        sys.path.insert(0, str(SRC_DIR))
    try:
        module = importlib.import_module(config.OPTIMIZER_MODULE)
        return getattr(module, "generate_itinerary")
    except (ImportError, AttributeError) as e:
        raise APIError(500, "optimizer_unavailable",
                       f"Cannot load generate_itinerary from '{config.OPTIMIZER_MODULE}': {e}")


def ensure_available() -> None:
    """Fail fast before spending Google API calls if the optimizer can't be imported."""
    _load()


def run(trip: dict, pois: list[dict], travel_times: dict) -> dict:
    result = _load()(trip, pois, travel_times)
    if not isinstance(result, dict) or result.get("status") not in ("ok", "infeasible"):
        raise APIError(500, "optimizer_contract_error",
                       "Optimizer did not return an ItineraryResult (see Data Contract v0.1).")
    return result
