# Darukaa.Earth

Darukaa.Earth is a restoration and carbon-yield simulator. The existing React/Vite dashboard draws Mapbox polygons, saves owned projects and sites through FastAPI, and displays transparent 10-year simulated carbon and biodiversity estimates.

## Architecture

- `frontend`: React + Vite, Mapbox GL JS + Mapbox Draw, Chart.js
- `backend`: FastAPI, SQLAlchemy, GeoAlchemy2, PostgreSQL/PostGIS
- Authentication: bcrypt password hashes and JWT bearer tokens
- Deployment: Vercel frontend, Render web service and PostgreSQL database

## Local setup

1. Create a PostGIS-enabled PostgreSQL database named `darukaa`.
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`, `JWT_SECRET_KEY`, and `CORS_ORIGINS`.
3. Install and run the backend:

```powershell
cd backend
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 9000
```

4. Set `VITE_API_URL=http://127.0.0.1:9000` in `frontend/.env.local` and keep the existing `VITE_MAPBOX_TOKEN` in `frontend/.env`.
5. Install and run the frontend:

```powershell
cd frontend
npm install
npm run dev
```

The API is available at `http://127.0.0.1:9000/docs`. `/health` is a liveness check; `/health/db` reports PostgreSQL readiness.

## Data model

`users` own `projects`; projects own `sites`; sites store a PostGIS `POLYGON` geometry in EPSG:4326 and a server-calculated `area_km2`. `simulations` is available for persisted future runs; the current GET simulation endpoint computes the transparent MVP estimate on demand.

## Deployment

- Vercel: import `frontend`, set `VITE_API_URL` to the Render API URL and retain `VITE_MAPBOX_TOKEN` as a Vercel environment variable.
- Render: use the root `render.yaml` blueprint. Set `DATABASE_URL` to Supabase/Render PostGIS, `JWT_SECRET_KEY` to a random secret, and `CORS_ORIGINS` to the Vercel URL.
- GitHub Actions runs backend compilation/tests plus frontend lint/build on pushes and pull requests.

All simulation responses are labeled simulated estimates and are not verified carbon credits or measured biodiversity.
