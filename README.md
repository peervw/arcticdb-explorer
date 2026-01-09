# ArcticDB Explorer

A modern, web-based explorer for [ArcticDB](https://github.com/man-group/arcticdb), a high-performance Python-native database for time-series and tick data.

![Dashboard Preview](dashboard_preview.png)

## Features

- **Universal Connection**: Connect to any ArcticDB instance via LMDB or S3.
- **Secure S3 Access**: Optional in-memory credential handling for S3 connections – keys are never stored on disk.
- **Library & Symbol Browser**: Intuitive sidebar navigation to explore your database structure.
- **Data Viewer**: Tabular view of your dataframes with support for large datasets (headers/paging).
- **Session Isolation**: Multi-user safe connection handling.
- **Health Check**: Automatic backend connectivity check on startup.
- **Dockerized**: Specific Dockerfiles for backend and frontend for easy deployment.

## Tech Stack

- **Backend**: Python, FastAPI, ArcticDB, Pandas
- **Frontend**: TypeScript, Next.js 16, TailwindCSS, shadcn/ui
- **Containerization**: Docker, Docker Compose

## Quick Start (Docker)

The easiest way to run the application is with Docker Compose:

```bash
docker-compose up --build
```

The frontend runs on port `3000` inside the container. If using a reverse proxy, point it to the container's internal port `3000`.

### Production Deployment

For production with a reverse proxy (e.g., Nginx, Traefik, Coolify):

1. The frontend container exposes port `3000` internally
2. The backend container exposes port `8000` internally
3. Configure your reverse proxy to connect to the frontend container on port `3000`
4. The backend is only accessible within the Docker network (not exposed externally)

**Note**: Both services communicate internally via Docker's network. The backend is never exposed to the internet.

## Manual Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Server runs on `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Client runs on `http://localhost:3000`.

## API Endpoints

- `GET /api/health` - Health check endpoint (used by Docker healthcheck and frontend startup)
- `POST /api/connect` - Connect to an ArcticDB instance
- `GET /api/libraries` - List all libraries
- `GET /api/libraries/{library}/symbols` - List symbols in a library

## Configuration

- **Ports** (internal):
  - Frontend: 3000
  - Backend: 8000
- **Environment Variables** (Optional):
  - `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://backend:8000/api` in Docker)
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: If set on the backend server, can be used for auth. Otherwise, use the UI input fields.

## Development

- **Formatting**: Code is formatted with `black` (Python) and `prettier` (TS).
- **Linting**: Uses `eslint` for Next.js.

## License

MIT
