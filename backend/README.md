# Darukaa.Earth Backend

Simple FastAPI + PostgreSQL/PostGIS API for restoration projects and sites.

## Prerequisites

- Python 3.11+
- PostgreSQL with the PostGIS extension

## Database setup

Create a database and enable PostGIS:

```sql
CREATE DATABASE darukaa;
\c darukaa
CREATE EXTENSION IF NOT EXISTS postgis;
```

The API creates the PostGIS extension and MVP tables on startup. Startup fails
when the database cannot be reached so deployment health does not look green
while persistence is unavailable.

## Local setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Edit `.env` and set `DATABASE_URL` to your local Postgres credentials. Do not commit `.env`.
Also set `JWT_SECRET_KEY` to a long random value and `CORS_ORIGINS` to the deployed
frontend URL in production.

Start the API:

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 9000
```

Health check: [http://127.0.0.1:9000/health](http://127.0.0.1:9000/health)

API docs: [http://127.0.0.1:9000/docs](http://127.0.0.1:9000/docs)

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Service health |
| POST | `/auth/register` | Register with bcrypt password hashing |
| POST | `/auth/login` | Return a JWT bearer token |
| GET | `/projects` | List the authenticated user's projects |
| POST | `/projects` | Create an authenticated user's project |
| GET | `/projects/{id}` | Get an owned project |
| GET | `/projects/{project_id}/sites` | List owned sites for a project |
| POST | `/projects/{project_id}/sites` | Create a PostGIS polygon site and calculate area |
| GET | `/sites/{site_id}` | Get an owned site |
| DELETE | `/sites/{site_id}` | Delete an owned site |
| GET | `/sites/{site_id}/simulation?scenario=Moderate` | Return a 10-year simulated estimate |

All project and site endpoints require `Authorization: Bearer <token>`.

Simulation outputs are explicitly planning estimates:

- Conservative: 35 tonnes CO2e/km²/year, biodiversity bonus 8
- Moderate: 50 tonnes CO2e/km²/year, biodiversity bonus 15
- Aggressive: 70 tonnes CO2e/km²/year, biodiversity bonus 25

They are not verified carbon credits or measured biodiversity.

CORS is enabled for the Vite frontend at `http://localhost:5173`.

Site geometry must be a GeoJSON Polygon, for example:

```json
{
  "name": "Western Forest Site",
  "area_km2": 12.4,
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [72.8, 18.9],
        [72.9, 18.9],
        [72.9, 19.0],
        [72.8, 19.0],
        [72.8, 18.9]
      ]
    ]
  }
}
```
