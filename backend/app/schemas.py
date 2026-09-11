from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class PolygonGeometry(BaseModel):
    type: Literal["Polygon"]
    coordinates: list[list[list[float]]]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    status: str = "Planning"


class ProjectRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    status: str
    user_id: int
    created_at: datetime
    site_count: int = 0


class SiteCreate(BaseModel):
    name: str = Field(default="Restoration Site", min_length=1, max_length=255)
    geometry: PolygonGeometry


class SiteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    geometry: PolygonGeometry | None = None


class SiteRead(BaseModel):
    id: int
    project_id: int
    name: str
    area_km2: float
    geometry: dict[str, Any]
    created_at: datetime


class SimulationRead(BaseModel):
    site_id: int
    scenario: Literal["Conservative", "Moderate", "Aggressive"]
    area_km2: float
    total_carbon: float
    biodiversity_score: int
    yearly_carbon: list[dict[str, float | int]]
    disclaimer: str = "SIMULATED ESTIMATES; not verified carbon credits or measured biodiversity."


class SimulationCreate(BaseModel):
    scenario: Literal["Conservative", "Moderate", "Aggressive"] = "Moderate"
