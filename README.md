# Smart College Bus Network

A real-time college transportation network that connects students, drivers, buses, routes, and college administrators.

## Project Overview

When a student misses their regular bus, they can open the Smart College Bus application to track their bus or find the best alternative bus that will reach their stop. The platform features role-based access for students and drivers, live GPS tracking, and a smart recommendation engine that analyzes live bus locations, routes, and ETAs.

## Architecture & Tech Stack

**Frontend:** React, TypeScript, Vite, React Router, TailwindCSS, Leaflet (Maps), Zustand
**Backend:** FastAPI, Python, SQLAlchemy, Pydantic, WebSockets (for live updates)
**Database:** SQLite (local development), PostgreSQL-ready (for production)
**Containerization:** Docker & Docker Compose

## Folder Structure

```text
smart-college-bus-network/
│
├── frontend/             # React application (Student Live Map & Driver Dashboard)
├── backend/              # FastAPI application (Location API, Websockets, Recommendation Engine)
├── docker-compose.yml    # Docker configuration
└── README.md
```

## Installation & Setup

### Quick Start — Windows

The easiest way to run the application on Windows is to use the provided batch files.

1. Double-click `start.bat` in the project root.
2. This will launch two separate command windows for the backend and frontend.
3. Open [http://localhost:5173](http://localhost:5173/) in your browser to access the frontend.
4. The Backend API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).

If you want to run them individually:
- `backend_start.bat`: Navigates to the backend, activates the virtual environment, and starts the FastAPI server.
- `frontend_start.bat`: Navigates to the frontend, installs dependencies if necessary, and starts the Vite development server.

### Environment Variables

A default `.env` is configured through `pydantic-settings` in the backend for local development, but you can create a `.env` file in `backend/` based on `backend/app/core/config.py`.

### Running Locally without Docker

**1. Backend:**
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\Activate.ps1
# Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python app/seed/seed_data.py
uvicorn app.main:app --reload --port 8000
```

**2. Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Running with Docker

```bash
docker-compose up --build
```
*Note: Ensure to run the seed script on the backend container to populate initial demo data if you use PostgreSQL.*

## Demo Scenario

A full demo scenario is seeded into the database:

- **Student**: Demo Student (Regular bus: Bus 05, Stop: Gandhipuram)
- **Scenario**: Bus 05 has already passed Gandhipuram. Bus 07 is approaching the stop and Bus 02 is further away.
- **Workflow**:
  1. Open the Student Live Map frontend at `http://localhost:5173/student`.
  2. The application will detect that Bus 05 has passed the stop and display a "You missed your regular bus" prompt.
  3. Click **"Find Alternative Bus"**.
  4. The Recommendation Engine will calculate ETAs for all active buses serving that stop and recommend **Bus 07**, allowing you to track it.

## Testing
Unit and integration testing frameworks are available via Pytest on the backend and Vitest/Jest on the frontend (to be configured).

## Deployment Notes
- Ensure CORS configurations in `backend/app/core/config.py` are updated for production domains.
- Configure `DATABASE_URL` for PostgreSQL.
- HTTPS must be used for PWA features and Geolocation API.
