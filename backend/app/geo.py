from typing import Any

from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping, shape
from shapely.geometry.polygon import Polygon

from app.schemas import PolygonGeometry


def polygon_to_geometry(geojson: PolygonGeometry):
    polygon = shape(geojson.model_dump())
    if not isinstance(polygon, Polygon) or polygon.is_empty:
        raise ValueError("geometry must be a non-empty GeoJSON Polygon")
    return from_shape(polygon, srid=4326)


def geometry_to_geojson(geometry) -> dict[str, Any]:
    return mapping(to_shape(geometry))
