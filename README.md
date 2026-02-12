# Research Dashboard

An oncology-focused dashboard for cancer care analytics. Supports comparative analysis (AI vs baseline), error/failure analysis, cohort exploration, and reproducible workflows.

## Beta Testing Warning

This system is in beta testing. Do not add any real patient data or PHI. Use dummy data only.

## Features

- **Research Analytics** – AI vs baseline risk stratification, treatment comparison, temporal trends, cohort summary
- **Error & Failure Analysis** – False positives/negatives, high-confidence errors, performance by subgroup
- **Patients** – View and filter patient data, export CSV/Excel
- **Data Explorer** – Correlation analysis, scatter plots
- **Data Insights** – Anomaly detection, outlier identification
- **Data Quality** – Data quality analysis
- **ML & Statistics** – Risk prediction, PSA trends, statistical tests
- **Clinical Reports** – Surgical intelligence PDF, risk assessment
- **Admin** – Users, data upload, REDCap config, audit logs, backup

## Tech Stack

- **Frontend:** React, Material-UI, Recharts
- **Backend:** FastAPI, SQLAlchemy, SQLite/PostgreSQL

## Quick Start

### Prerequisites
- Python 3.11 or 3.12
- Node.js 16+
- npm

### Backend

```bash
cd backend
python3.12 -m venv venv
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python scripts/create_admin_user.py
./venv/bin/python -m uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

- **Dashboard:** http://localhost:3000
- **API:** http://localhost:8000
- **API docs:** http://localhost:8000/api/docs

### First Login
Navigate to http://localhost:3000/login and use the admin credentials from `create_admin_user.py`.

## Environment

Copy `.env.example` to `.env` and configure:

```
DATABASE_URL=sqlite:///./patient_dashboard.db
REACT_APP_API_URL=http://localhost:8000
```

## Deploy With Render + Supabase + GitHub Pages

Use Supabase for PostgreSQL, Render for the FastAPI backend, and GitHub Pages for the React frontend.

### 1) Create Supabase Project

- In Supabase, create a new project.
- Go to `Settings -> Database` and copy the connection string.
- Use SQLAlchemy format with SSL:

```bash
DATABASE_URL=postgresql+psycopg2://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

Create a storage bucket for uploads:

- Go to `Storage -> Buckets`
- Create bucket: `research-dashboard-storage`
- Keep it private (backend uses service-role key for uploads)

### 2) Deploy Backend on Render

Create a new **Web Service** on Render and point it at this repo:

- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT --proxy-headers`

Set these environment variables in Render:

```bash
DATABASE_URL=<supabase-connection-string>
SECRET_KEY=<strong-random-secret>
ENCRYPTION_KEY=<fernet-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
ENVIRONMENT=production
ALLOWED_ORIGINS=https://urology-ai.github.io
FORCE_HTTPS=true
SUPABASE_STORAGE_BUCKET=research-dashboard-storage
SUPABASE_STORAGE_REQUIRED=true
```

### 3) Deploy Frontend on GitHub Pages

Automatic deploy is now configured via GitHub Actions on every push to `master`/`main`.

One-time GitHub repository setup:

- **Settings -> Pages**: Source = `Deploy from a branch`, Branch = `gh-pages`, Folder = `/(root)`
- **Settings -> Actions -> General -> Workflow permissions**: `Read and write permissions`
- **Settings -> Secrets and variables -> Actions -> Variables**:
  - `REACT_APP_API_URL=https://<your-backend-domain>`

Manual fallback (if needed) from the `frontend` directory:

```bash
npm install
REACT_APP_API_URL=https://<your-backend-domain> CI=false npm run deploy
```

If you prefer not to inline vars, put them in `frontend/.env.production`:

```bash
REACT_APP_API_URL=https://<your-backend-domain>
CI=false
```

GitHub Pages URL:

`https://urology-ai.github.io/research-dashboard`

In GitHub repository settings, enable **Pages** and use the `gh-pages` branch as the source.

### 4) Post-Deploy Smoke Test

- Backend health: `https://<your-backend-domain>/health`
- API docs: `https://<your-backend-domain>/api/docs`
- Frontend loads and can log in
- Browser console has no CORS errors

## Data Sources

- Excel/CSV upload (admin)
- REDCap API (optional, requires `pip install PyCap`)

## API Endpoints

| Category | Endpoints |
|----------|-----------|
| Auth | `/api/auth/login`, `/api/auth/me`, `/api/auth/logout` |
| Patients | `GET /api/patients`, `GET /api/patients/{id}` |
| Analytics | `/api/analytics/dashboard-stats`, `/api/analytics/risk-stratification`, etc. |
| Export | `/api/export/patients/csv`, `/api/export/patient/{id}/summary` |
| Search | `/api/search/patients`, `/api/search/global` |

Full API docs at http://localhost:8000/api/docs

## Project Structure

```
research-dashboard/
├── backend/          # FastAPI backend
│   ├── routes/       # API endpoints
│   ├── models/       # Database models
│   ├── services/     # Business logic
│   └── scripts/      # create_admin_user, generate_secrets
├── frontend/         # React frontend
│   └── src/
│       ├── pages/    # ResearchAnalytics, ErrorAnalysis, PatientList, etc.
│       ├── components/
│       └── contexts/ # Auth, Research, Theme
└── docs/             # HIPAA_SECURITY, SECURITY_CHECKLIST
```

## Git Remote

Set repo remote to:

```bash
git remote set-url origin git@github.com:Urology-AI/research-dashboard.git
git remote -v
```

## Security

- Role-based access (admin, clinician)
- Two-factor authentication
- HIPAA-compliant audit logging
- See `docs/HIPAA_SECURITY.md` and `docs/SECURITY_CHECKLIST.md`
