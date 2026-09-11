from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.geo import geometry_to_geojson, polygon_to_geometry
from app.models import Project, Simulation, Site
from app.schemas import SimulationCreate, SimulationRead, SiteCreate, SiteRead, SiteUpdate

router = APIRouter(tags=["sites"])


def to_site_read(site: Site) -> SiteRead:
    return SiteRead(
        id=site.id,
        project_id=site.project_id,
        name=site.name,
        area_km2=site.area_km2,
        geometry=geometry_to_geojson(site.geometry),
        created_at=site.created_at,
    )


def get_owned_project(project_id: int, current_user, db: Session) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def get_owned_site(site_id: int, current_user, db: Session) -> Site:
    site = (
        db.query(Site)
        .join(Project)
        .filter(Site.id == site_id, Project.user_id == current_user.id)
        .first()
    )
    if site is None:
        raise HTTPException(status_code=404, detail="Site not found")
    return site


def calculate_area_km2(db: Session, site: Site) -> float:
    return float(
        db.scalar(
            select(func.ST_Area(func.ST_Transform(Site.geometry, 6933)) / 1000000).where(
                Site.id == site.id
            )
        )
    )


@router.get("/projects/{project_id}/sites", response_model=list[SiteRead])
def list_sites(
    project_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_project(project_id, current_user, db)

    sites = db.query(Site).filter(Site.project_id == project_id).all()
    return [to_site_read(site) for site in sites]


@router.post(
    "/projects/{project_id}/sites",
    response_model=SiteRead,
    status_code=status.HTTP_201_CREATED,
)
def create_site(
    project_id: int,
    payload: SiteCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_owned_project(project_id, current_user, db)
    try:
        geometry = polygon_to_geometry(payload.geometry)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    site = Site(
        project_id=project_id,
        name=payload.name,
        area_km2=0,
        geometry=geometry,
    )
    db.add(site)
    db.flush()
    site.area_km2 = calculate_area_km2(db, site)
    db.commit()
    db.refresh(site)
    return to_site_read(site)


@router.get("/sites/{site_id}", response_model=SiteRead)
def get_site(
    site_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return to_site_read(get_owned_site(site_id, current_user, db))


@router.patch("/sites/{site_id}", response_model=SiteRead)
def update_site(
    site_id: int,
    payload: SiteUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = get_owned_site(site_id, current_user, db)
    if payload.name is not None:
        site.name = payload.name
    if payload.geometry is not None:
        try:
            site.geometry = polygon_to_geometry(payload.geometry)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        db.flush()
        site.area_km2 = calculate_area_km2(db, site)
    db.commit()
    db.refresh(site)
    return to_site_read(site)


@router.delete("/sites/{site_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_site(
    site_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = get_owned_site(site_id, current_user, db)
    db.delete(site)
    db.commit()


@router.get("/sites/{site_id}/simulation", response_model=SimulationRead)
def get_simulation(
    site_id: int,
    scenario: str = "Moderate",
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    site = get_owned_site(site_id, current_user, db)

    rates = {"Conservative": 35, "Moderate": 50, "Aggressive": 70}
    bonuses = {"Conservative": 8, "Moderate": 15, "Aggressive": 25}
    if scenario not in rates:
        raise HTTPException(status_code=400, detail="Invalid simulation scenario")

    yearly_carbon = [
        {"year": year, "carbon": site.area_km2 * rates[scenario] * year}
        for year in range(1, 11)
    ]
    biodiversity_score = min(
        100,
        round(35 + site.area_km2 * 1.2 + bonuses[scenario]),
    )
    return SimulationRead(
        site_id=site.id,
        scenario=scenario,
        area_km2=site.area_km2,
        total_carbon=yearly_carbon[-1]["carbon"],
        biodiversity_score=biodiversity_score,
        yearly_carbon=yearly_carbon,
    )


@router.post("/sites/{site_id}/simulation", response_model=SimulationRead, status_code=201)
def save_simulation(
    site_id: int,
    payload: SimulationCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = get_simulation(site_id, payload.scenario, current_user, db)
    simulation = Simulation(
        site_id=result.site_id,
        scenario=result.scenario,
        area_km2=result.area_km2,
        total_carbon=result.total_carbon,
        biodiversity_score=result.biodiversity_score,
        yearly_carbon=result.yearly_carbon,
    )
    db.add(simulation)
    db.commit()
    return result
