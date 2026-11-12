<div align="center">

# 🇮🇳 Scheme Saathi

### AI-powered assistant that helps Indian citizens discover, understand and apply for government welfare schemes

![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB?logo=react&logoColor=white)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google&logoColor=white)
![Languages](https://img.shields.io/badge/Languages-English%20%7C%20Hindi%20%7C%20Marathi-orange)
![License](https://img.shields.io/badge/License-see%20LICENSE-lightgrey)

[Live Demo](https://agent-x-scheme-saathi-git-main-raimanyata2024-8498.vercel.app/) ·
[API Docs](https://agentx-scheme-saathi-backend.vercel.app/docs) ·
[Architecture](docs/architecture.md)

</div>

---

## 📖 Overview

India has hundreds of central and state welfare schemes, but many citizens never claim the benefits they qualify for. The information is scattered across ministry websites, the eligibility rules are hard to read, and the application process is confusing, especially for people who are more comfortable in Hindi or Marathi than in English.

**Scheme Saathi** ("Scheme Companion") brings the whole journey into one place:

1. **Discover** the schemes that exist.
2. **Check eligibility** against your own profile, with a clear explanation of *why* you do or don't qualify.
3. **Prepare documents** with a personalised checklist and an upload vault.
4. **Get application-ready** with pre-filled forms and a readiness score.
5. **Apply safely** through the official portal, with your explicit confirmation at every step.

You can do all of this by browsing, or just by **talking to the AI assistant** in your own language, by typing or by voice.

---

## ✨ Key Features

| Feature | What it does |
|---|---|
| 🔍 **Scheme catalogue** | 31 verified schemes across agriculture, health, education, housing, women welfare, employment, skill development, financial inclusion and social security. Search by keyword and filter by category. |
| ✅ **Deterministic eligibility engine** | A rule engine written in plain Python evaluates each scheme's rules against the citizen's profile. Results are `eligible`, `not eligible`, `potentially eligible` or `insufficient information`, with a per-condition explanation. **The AI can explain a result but can never change it.** |
| 💬 **Multilingual AI assistant** | A Gemini-powered chat that understands intent, asks follow-up questions and calls backend tools. Replies come in clean English, Hindi or Marathi, with no language mixing. |
| 🎙️ **Voice input and read-aloud** | Speak your question and listen to the answer, using the browser's speech recognition and text-to-speech. |
| 📄 **Document vault and checklist** | Scheme-specific document checklists, uploads with OCR (Tesseract, Hindi and English), and per-document status: uploaded, reviewed, verified, rejected or missing. |
| 📝 **Application readiness** | Pre-filled forms from the citizen's profile, field-by-field validation, and a readiness check across profile, form fields and documents. |
| 🛡️ **Safe submission workflow** | Explicit citizen confirmation bound to the exact reviewed version of the application, duplicate-submission prevention, and an honest portal handoff (see below). |
| 👤 **Citizen profile and onboarding** | A guided profile (age, state, occupation, income, caste category, land holding and more) that drives eligibility and form pre-fill. |
| 🧪 **Mock and Live modes** | A built-in toggle between offline demo data and the real backend, handy for demos and frontend development. |

---

## 🛡️ Design Principles

Scheme Saathi deals with people's money, identity and benefits, so it is built around a few firm rules:

- **The LLM never decides eligibility.** Rules are evaluated by deterministic code, and the AI only explains the outcome.
- **No submission without confirmation.** The assistant cannot submit an application unless the citizen explicitly confirms the exact version they reviewed. Any change to the form, profile or documents invalidates that confirmation.
- **Honest about government portals.** The app never pretends to submit to a government system. It supports three modes:
  - **Direct API:** only where an authorised portal adapter genuinely exists.
  - **Portal-assisted:** the official link plus step-by-step instructions in the citizen's language, and the citizen returns with their official reference number.
  - **Manual:** the document checklist plus CSC and offline instructions.
- **Official controls are never bypassed.** OTP, CAPTCHA, Aadhaar e-KYC and portal logins stay with the citizen.
- **Unverified schemes are not guessed.** Schemes pending verification are shown as such, with no invented steps.
- **Privacy by default.** Passwords are hashed with bcrypt, sessions use JWT, and uploaded documents are kept private.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│   React + TypeScript (Vite) · Tailwind CSS · Mobile-first  │
│   Chat · Scheme cards · Documents · Applications · Voice   │
└─────────────────────────────┬──────────────────────────────┘
                              │ HTTPS / REST + JSON
┌─────────────────────────────▼──────────────────────────────┐
│                  FastAPI backend (Python)                  │
│                                                            │
│   API routes ──► AI agent orchestrator (Gemini + tools)    │
│        │                                                   │
│        ▼                                                   │
│   Services: Profile · Scheme · Document · Application ·    │
│             Readiness · Submission · Portal registry       │
│        │                                                   │
│        ▼                                                   │
│   Eligibility rule engine (deterministic, no LLM)          │
└─────────────────────────────┬──────────────────────────────┘
                              │
              PostgreSQL (Supabase / standard)  ·  Private file storage
```

The AI agent is a single orchestrator that calls registered backend tools (`get_user_profile`, `search_schemes`, `check_eligibility`, `build_document_checklist`, `create_application_draft`, and others). Business logic lives in the service layer rather than in the model or the routes, so each part can be tested on its own.

📚 See [docs/architecture.md](docs/architecture.md) for the full design.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, React Router, Tailwind CSS, Lucide icons |
| **Backend** | Python, FastAPI, SQLAlchemy 2, Pydantic 2, Alembic, APScheduler |
| **Database** | PostgreSQL (Supabase-compatible) |
| **AI** | Google Gemini with function / tool calling |
| **OCR** | Tesseract (English and Hindi) via `pytesseract` |
| **Auth** | bcrypt password hashing and JWT access tokens |
| **Testing** | Pytest (backend), Vitest and Testing Library (frontend) |
| **CI/CD** | GitHub Actions, Docker, Vercel |

---

## 📁 Project Structure

```
AgentX-SchemeSaathi/
├── frontend/                  # React + TypeScript app
│   └── src/
│       ├── pages/             # Landing, Schemes, Eligible, Chat, Documents, Applications, Dashboard…
│       ├── components/        # Layout, common UI, chat widgets
│       ├── services/api/      # Typed API client and per-resource services
│       ├── services/mock/     # Offline demo data
│       ├── context/           # Auth, language, API-mode providers
│       └── hooks/             # Voice assistant (speech-to-text / text-to-speech)
├── backend/
│   ├── app/
│   │   ├── api/v1/            # auth, profile, schemes, eligibility, agent, documents, applications, health
│   │   ├── agents/            # Orchestrator, planner, tool registry, form schemas
│   │   ├── eligibility/       # Deterministic rule engine
│   │   ├── services/          # Business logic
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   └── scripts/           # Scheme seeding
│   ├── alembic/               # Database migrations
│   ├── data/schemes/          # Authoritative JSON for each scheme
│   ├── tests/                 # Unit, API and integration tests
│   └── Dockerfile
├── docs/                      # Architecture, API contracts, DB schema, PRDs
└── .github/workflows/         # Backend CI
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- PostgreSQL 14+ (local, Docker or Supabase)
- A [Google Gemini API key](https://aistudio.google.com/) (only needed for the AI chat)

### 1. Clone

```bash
git clone https://github.com/raimanyata2024/AgentX-SchemeSaathi.git
cd AgentX-SchemeSaathi
```

### 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env                 # then fill in your values (see below)

alembic upgrade head                 # create the database tables
python -m app.scripts.seed_schemes   # load the 31 schemes
uvicorn app.main:app --reload --port 8000
```

Interactive API docs are available at **http://localhost:8000/docs**.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:5173**.

### 🔑 Environment Variables

**Backend (`backend/.env`)**

| Variable | Description |
|---|---|
| `APP_ENV` | `development` or `production` |
| `DEBUG` | Set to `false` in production |
| `SECRET_KEY`, `JWT_SECRET` | Long random strings. Weak values are rejected in production. |
| `DATABASE_URL` | PostgreSQL connection string |
| `ALLOWED_ORIGINS` | Comma-separated list of frontend URLs allowed by CORS |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Gemini credentials for the AI assistant |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings (storage) |

**Frontend (`frontend/.env.local`)**

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Backend base URL, for example `http://localhost:8000/api/v1` |
| `VITE_USE_MOCK` | `true` for offline demo data, `false` to use the real backend |

> 💡 **Mock vs Live:** Mock mode shows a small built-in sample of schemes and needs no backend. Live mode (the **Live API** badge in the header) uses the full catalogue, the AI assistant, documents and applications.

---

## 🔌 API Overview

All endpoints live under `/api/v1`. Full details are in the interactive docs at `/docs`.

| Group | Prefix | Purpose |
|---|---|---|
| Health | `/health` | Service status |
| Auth | `/auth` | Register, login, current user |
| Profile | `/profile` | Create and update the citizen profile |
| Schemes | `/schemes` | Search and fetch the scheme catalogue |
| Eligibility | `/eligibility` | Evaluate eligibility and get next questions |
| Agent | `/agent` | Multilingual AI chat |
| Documents | `/documents` | Checklists, uploads, OCR, verification |
| Applications | `/applications` | Drafts, validation, readiness, confirmation, submission |

---

## 🧪 Testing

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

Backend tests cover the API, the eligibility engine, migrations, scheme seeding and authorisation rules. GitHub Actions runs the backend suite against a PostgreSQL service on every push and pull request.

---

## ☁️ Deployment

- **Frontend:** deployed on [Vercel](https://vercel.com). Set the project root to `frontend` and add `VITE_API_BASE_URL` and `VITE_USE_MOCK`. Vite reads these at build time, so redeploy after changing them.
- **Backend:** a production `Dockerfile` is included. It installs Tesseract OCR, runs migrations on startup and seeds the schemes. For the full feature set (OCR and background jobs), host it as a container on a service such as Render, Railway or Fly.io. Remember to add the frontend's URL to `ALLOWED_ORIGINS`.
- **Database:** any managed PostgreSQL, such as Supabase or Neon. Create the tables with `alembic upgrade head`.

---

## 🗺️ Supported Schemes (31)

| Category | Schemes |
|---|---|
| 🌾 **Agriculture** | PM-KISAN, PM-KMY, PMFBY, KCC, PMMSY, Namo Shetkari Maha Samman Nidhi |
| 🏥 **Health** | Ayushman Bharat PM-JAY, Janani Suraksha Yojana, MPJAY (Maharashtra) |
| 🎓 **Education** | NMMS, NSP-CSSS, PM-SHRI, Post-Matric Scholarship (SC) |
| 🏠 **Housing** | PMAY-Gramin, PMAY-Urban 2.0 |
| 👩 **Women welfare** | PMMVY, PM Ujjwala Yojana, Sukanya Samriddhi Yojana, Majhi Ladki Bahin (Maharashtra) |
| 💼 **Employment** | MGNREGA, DAY-NRLM, PMEGP |
| 🛠️ **Skill development** | PMKVY, PM Vishwakarma |
| 🏦 **Financial inclusion** | PM Jan Dhan Yojana, PM Mudra Yojana, PM SVANidhi, Stand-Up India |
| 🛡️ **Social security** | Atal Pension Yojana, PMJJBY, PMSBY |

Each scheme is stored as structured JSON (rules, benefits, documents, official links) in `backend/data/schemes/` and loaded with the seed script. See [docs/scheme-data-format.md](docs/scheme-data-format.md) for the format.

---

## 📚 Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | System design and component responsibilities |
| [API Contracts](docs/api-contracts.md) | Endpoint definitions and schemas |
| [Database Schema](docs/database-schema.md) | Tables and relationships |
| [Scheme Data Format](docs/scheme-data-format.md) | JSON format for schemes |
| [Development Workflow](docs/development-workflow.md) | Branching, commits and pull requests |
| [Backend PRD](docs/PRD-Backend.md) · [Frontend PRD](docs/PRD-Frontend.md) | Product requirements |

---

## 🤝 Contributing

1. Fork the repository and create a branch (`feature/your-feature`).
2. Make your changes and add tests where it makes sense.
3. Run the backend and frontend test suites.
4. Open a pull request describing what you changed and why.

See the [Development Workflow](docs/development-workflow.md) for branching and commit conventions.

---

## ⚠️ Disclaimer

Scheme Saathi is an informational and assistive tool. Eligibility results are guidance based on the information a citizen provides and the scheme rules in our catalogue, and they are **not an official determination**. Always confirm details, and complete your application, on the official government portal for each scheme.

---

## 📄 License

Distributed under the terms of the [LICENSE](LICENSE) file.

<div align="center">

Made with ❤️ to help every citizen reach the benefits they deserve.

</div>
