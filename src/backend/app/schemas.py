"""Request/response models for the frontend <-> backend contract (Data Contract v0.1, part 2)."""

from datetime import date
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, Field, field_validator, model_validator

CONTRACT_VERSION = "0.1"
MAX_SELECTIONS = 20  # NFR-P2 benchmark size


class LatLng(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class TripIn(BaseModel):
    """TripConfig fields without contract_version, plus `pace` (applied by the backend)."""

    city: str = Field(min_length=1)
    timezone: str = "America/Toronto"
    dates: list[date] = Field(min_length=1)
    day_start: int = Field(ge=0, le=1440, description="minutes since midnight, e.g. 540 = 09:00")
    day_end: int = Field(ge=0, le=1440)
    budget: float = Field(ge=0)
    transport_mode: Literal["walk", "drive", "transit"]
    accommodation: LatLng
    meal_windows: dict[Literal["lunch", "dinner"], tuple[int, int]] | None = None
    pace: Literal["relaxed", "normal", "packed"] = "normal"

    @field_validator("timezone")
    @classmethod
    def _valid_tz(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError(f"unknown timezone {v!r}")
        return v

    @model_validator(mode="after")
    def _check(self):
        if self.day_start >= self.day_end:
            raise ValueError("day_start must be before day_end")
        if len(set(self.dates)) != len(self.dates):
            raise ValueError("dates must be unique")
        for name, (s, e) in (self.meal_windows or {}).items():
            if not 0 <= s < e <= 1440:
                raise ValueError(f"meal window {name} is invalid")
        return self

    def to_contract(self) -> dict:
        """TripConfig as the optimizer expects it (pace is not passed — see contract)."""
        trip = {
            "contract_version": CONTRACT_VERSION,
            "city": self.city,
            "timezone": self.timezone,
            "dates": [d.isoformat() for d in sorted(self.dates)],
            "day_start": self.day_start,
            "day_end": self.day_end,
            "budget": self.budget,
            "transport_mode": self.transport_mode,
            "accommodation": self.accommodation.model_dump(),
        }
        if self.meal_windows:
            trip["meal_windows"] = {k: list(v) for k, v in self.meal_windows.items()}
        return trip


class Selection(BaseModel):
    place_id: str = Field(min_length=1)
    priority: int = Field(ge=1, le=10)
    visit_minutes: int | None = Field(default=None, ge=0, le=1440)


class GenerateRequest(BaseModel):
    trip: TripIn
    selections: list[Selection] = Field(min_length=1, max_length=MAX_SELECTIONS)

    @model_validator(mode="after")
    def _unique_places(self):
        ids = [s.place_id for s in self.selections]
        if len(set(ids)) != len(ids):
            raise ValueError("each place_id may be selected only once")
        return self


class PlaceSearchResult(BaseModel):
    place_id: str
    name: str
    kind: Literal["attraction", "restaurant"]
    lat: float
    lng: float
