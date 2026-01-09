# ArcticDB Explorer

A modern, web-based explorer for [ArcticDB](https://github.com/man-group/arcticdb), a high-performance Python-native database for time-series and tick data.

![Dashboard Preview](dashboard_preview.png)

## Features

- **Universal Connection**: Connect to any ArcticDB instance via LMDB or S3.
- **Secure S3 Access**: Optional in-memory credential handling for S3 connections – keys are never stored on disk.
- **Library & Symbol Browser**: Intuitive sidebar navigation to explore your database structure.
- **Data Viewer**: Tabular view of your dataframes with support for large datasets (headers/paging).
- **Session Isolation**: Multi-user safe connection handling.
- **Dockerized**: specific Dockerfiles for backend and frontend for easy deployment.

## Tech Stack

- **Backend**: Python, FastAPI, ArcticDB, Pandas
- **Frontend**: TypeScript, Next.js 14, TailwindCSS, shadcn/ui
- **Containerization**: Docker, Docker Compose

## Quick Start (Docker)

The easiest way to run the application is with Docker Compose:

```bash
docker-compose up --build
```

Access the application at [http://localhost:3020](http://localhost:3020) (default frontend port).

### Configuring Ports

Edit [.env.local](.env.local) to adjust the frontend port:

```bash
FRONTEND_PORT=3020
NEXT_PUBLIC_API_URL=http://localhost:8020/api
```

- `FRONTEND_PORT`: Port where the frontend will be accessible
- `NEXT_PUBLIC_API_URL`: Backend URL for local development (use `http://localhost:BACKEND_PORT/api` when running backend manually)

**Note**: In Docker Compose, the backend runs on an internal network and is not exposed to the host.

## Manual Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Server runs on `http://localhost:8020`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Client runs on `http://localhost:3020`.

## Configuration

- **Ports**:
  - Frontend: 3020
  - Backend: 8020
- **Environment Variables** (Optional):
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: If set on the backend server, can be used for auth. Otherwise, use the UI input fields.

## Development

- **Formatting**: Code is formatted with `black` (Python) and `prettier` (TS).
- **Linting**: Uses `eslint` for Next.js.

## License

MIT
