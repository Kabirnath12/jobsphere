# JobSphere

JobSphere is a B2B hiring platform for job seekers and recruiters. It combines public job discovery with authenticated candidate applications and recruiter hiring workflows.

## Features

- Responsive job marketplace
- Candidate and recruiter accounts
- JWT authentication
- Password hashing with bcrypt
- Role-based access control
- Company/workspace context for recruiters
- Job posting and management
- Job search and filters
- Candidate applications
- Duplicate-application protection
- Candidate application dashboard
- Recruiter application dashboard
- REST API
- MongoDB persistence with in-memory fallback for local development

## Tech Stack

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- bcrypt

## Run locally

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

The API runs on `http://localhost:5000`.

If MongoDB is not configured, the server automatically uses in-memory demo data.

### Frontend

Open `frontend/index.html` with VS Code Live Server.

## Main API routes

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/jobs`
- `POST /api/jobs`
- `POST /api/applications`
- `GET /api/dashboard/candidate`
- `GET /api/dashboard/recruiter`

## Project structure

```text
JobSphere/
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── README.md
```
