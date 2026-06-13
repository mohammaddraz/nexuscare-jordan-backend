<div align="center">

# 🏥 NexusCare Jordan — Backend API

**A multi-role, insurance-aware healthcare management REST API**  
Built with Node.js · Express.js · PostgreSQL · JWT Authentication

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-v4-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-v15-4169E1?style=flat&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
  - [Authentication](#authentication-endpoints)
  - [Admin Routes](#admin-endpoints)
  - [Consumer Routes](#consumer-endpoints)
  - [Provider Routes](#provider-endpoints)
- [Authentication & Authorization](#authentication--authorization)
- [Error Handling](#error-handling)
- [Contributing](#contributing)

---

## Overview

NexusCare Jordan Backend is a RESTful API that powers a multi-role healthcare management platform for the Jordanian insurance market. It connects three user roles — **Insurance Administrators**, **Healthcare Providers**, and **Consumers** (insured individuals + dependents) — within a single, unified system.

Key capabilities:
- 🔐 JWT-based authentication with role-based access control (RBAC)
- 👨‍👩‍👧 Family account management (consumers manage dependents under one account)
- 🗺️ Geographic provider directory with lat/lng coordinates (Google Maps-ready)
- 📋 Insurance claims lifecycle management (Pending → In Review → Paid/Rejected)
- 🏥 Clinical logging, PCP assignment workflows, and coverage verification
- 📧 Email notifications via Nodemailer

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | v18+ |
| Framework | Express.js | v4 |
| Database | PostgreSQL | v15 |
| Auth | JSON Web Tokens (JWT) | jsonwebtoken v9 |
| Password Hashing | bcryptjs | v2 |
| DB Client | node-postgres (pg) | v8 |
| Email | Nodemailer | v6 |
| Dev Server | Nodemon | v3 |

---

## Project Structure

```
nexuscare-jordan-backend/
├── src/
│   ├── config/
│   │   └── db.js                 # PostgreSQL client configuration
│   ├── controllers/
│   │   ├── authController.js     # Login, register logic
│   │   ├── adminController.js    # Admin CRUD operations
│   │   ├── consumerController.js # Consumer operations
│   │   └── providerController.js # Provider operations
│   ├── middlewares/
│   │   └── authMiddleware.js     # protect() + authorize() RBAC
│   ├── routes/
│   │   ├── authRoutes.js         # POST /api/auth/*
│   │   ├── adminRoutes.js        # /api/admin/*
│   │   ├── consumerRoutes.js     # /api/consumers/*
│   │   └── providerRoutes.js     # /api/providers/*
│   ├── services/
│   │   └── emailService.js       # Nodemailer email dispatch
│   └── server.js                 # App entry point
├── database/
│   ├── schema.sql                # Full PostgreSQL schema
│   ├── migrations/               # Incremental schema changes
│   └── seeds/                    # Sample data for development
├── .env.sample                   # Environment variable template
├── .gitignore
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js v18+](https://nodejs.org)
- [PostgreSQL v15+](https://www.postgresql.org/download/)
- [Git](https://git-scm.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mohammaddraz/nexuscare-jordan-backend.git
cd nexuscare-jordan-backend

# 2. Checkout develop branch
git checkout develop

# 3. Install dependencies
npm install

# 4. Set up environment variables
cp .env.sample .env
# Edit .env with your values (see Environment Variables section)

# 5. Set up the database
psql -U postgres -c "CREATE DATABASE nexuscare;"
psql -U postgres -d nexuscare -f database/schema.sql

# 6. Start development server
npm run dev
```

The API will be available at `http://localhost:5000`.

---

## Environment Variables

Copy `.env.sample` to `.env` and fill in all values. **Never commit `.env` to version control.**

```env
# Server
PORT=5000

# PostgreSQL Database
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=nexuscare
DB_PASSWORD=your_postgres_password
DB_PORT=5433

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here      # Use a long, random string in production

# Email (SMTP) — Leave blank to use Ethereal (dev mode)
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5173
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 5000) |
| `DB_USER` | Yes | PostgreSQL username |
| `DB_HOST` | Yes | Database host |
| `DB_DATABASE` | Yes | Database name |
| `DB_PASSWORD` | Yes | Database password |
| `DB_PORT` | Yes | PostgreSQL port (default: 5433) |
| `JWT_SECRET` | Yes | Secret key for signing JWTs — use 32+ random characters |
| `EMAIL_HOST` | No | SMTP host (leave blank for Ethereal dev mode) |
| `FRONTEND_URL` | Yes | Frontend URL used in email links |

---

## Database Setup

The full schema is in `database/schema.sql`. It creates 11 tables:

| Table | Description |
|-------|-------------|
| `users` | Central auth table — all roles share this |
| `admins` | Admin profile extending `users` |
| `providers` | Provider profile with location data |
| `patients` | Consumer + family member profiles |
| `insurance_companies` | Insurance company directory |
| `provider_networks` | Many-to-many: providers ↔ insurers |
| `pcp_assignments` | Primary Care Provider assignment requests |
| `medical_records` | Clinical encounter logs |
| `claims` | Insurance billing claims |
| `certifications` | Provider licence submissions |
| `coverage_requests` | Consumer plan change requests |

---

## API Documentation

All endpoints are prefixed with `/api`. Protected routes require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <your_jwt_token>
```

---

### Authentication Endpoints

**Base path:** `/api/auth`  
**Auth required:** None

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/auth/register` | Register a new user | `{ email, password, role }` |
| `POST` | `/api/auth/login` | Login and receive JWT token | `{ email, password }` |

**Login Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CONSUMER"
  }
}
```

---

### Admin Endpoints

**Base path:** `/api/admin`  
**Auth required:** Yes — Role: `ADMIN`

#### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard` | Platform-wide statistics summary |

#### Consumer Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/consumers` | List all consumers with approval status |
| `GET` | `/api/admin/consumers/:id` | Get single consumer detail |
| `PUT` | `/api/admin/consumers/:id` | Update consumer profile |
| `PATCH` | `/api/admin/consumers/:id/approve` | Approve a pending consumer |
| `PATCH` | `/api/admin/consumers/:id/reject` | Reject a pending consumer |

#### Provider & Network Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/providers` | List all providers |
| `GET` | `/api/admin/certifications` | List all certification submissions |
| `PATCH` | `/api/admin/certifications/:id` | Update certification status |
| `GET` | `/api/admin/networks` | List all provider-insurer network entries |
| `POST` | `/api/admin/networks` | Add provider to insurance network |
| `DELETE` | `/api/admin/networks/:id` | Remove provider from network |

#### Claims & Coverage
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/claims` | List all claims across the platform |
| `PATCH` | `/api/admin/claims/:id` | Update claim status |
| `GET` | `/api/admin/coverage-requests` | List all coverage change requests |
| `PATCH` | `/api/admin/coverage-requests/:id` | Process a coverage request |

#### Admin Account Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/admins` | List all admin accounts |
| `POST` | `/api/admin/admins` | Create a new admin account |
| `PUT` | `/api/admin/admins/:id` | Update admin account |
| `DELETE` | `/api/admin/admins/:id` | Delete admin account |

---

### Consumer Endpoints

**Base path:** `/api/consumers`  
**Auth required:** Yes — Role: `CONSUMER`

#### Family / Patient Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/consumers/patients` | Get all patients under this user account |
| `POST` | `/api/consumers/patients` | Add a new family member (dependent) |
| `PUT` | `/api/consumers/patients/:id` | Update a patient profile |
| `DELETE` | `/api/consumers/patients/:id` | Remove a dependent |

#### Provider Search
| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/api/consumers/providers` | Search in-network providers | `city`, `specialty`, `accepting_new`, `company_id`, `tier` |

#### PCP Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/consumers/pcp-assignments` | Request a PCP assignment |
| `GET` | `/api/consumers/pcp-assignments` | View PCP assignment status |

#### Medical Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/consumers/medical-records/:patientId` | View medical records for a patient |

#### Claims & Coverage
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/consumers/claims` | View all claims for this account |
| `POST` | `/api/consumers/coverage-requests` | Submit a coverage change request |
| `GET` | `/api/consumers/coverage-requests` | View submitted coverage requests |

---

### Provider Endpoints

**Base path:** `/api/providers`  
**Auth required:** Yes — Role: `PROVIDER`

#### Practice Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/providers/profile` | Get own provider profile |
| `PUT` | `/api/providers/profile` | Update profile (specialty, city, coords, etc.) |

#### Patient Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/providers/patients` | List enrolled patients |
| `GET` | `/api/providers/patients/verify/:nationalId` | Verify a patient's coverage by National ID |

#### PCP Assignments
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/providers/pcp-assignments` | List incoming PCP assignment requests |
| `PATCH` | `/api/providers/pcp-assignments/:id` | Accept or reject an assignment |

#### Clinical Logging
| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/providers/medical-records` | Submit a clinical log | `{ patient_id, diagnosis, icd_code, prescription, notes }` |
| `GET` | `/api/providers/medical-records/:patientId` | View records for a specific patient | — |

#### Billing & Claims
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/providers/claims` | Submit a billing claim |
| `GET` | `/api/providers/claims` | View all submitted claims |

#### Certifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/providers/certifications` | Submit a licence for verification |
| `GET` | `/api/providers/certifications` | View own certification status |

---

## Authentication & Authorization

The API uses two middleware functions defined in `src/middlewares/authMiddleware.js`:

**`protect`** — Verifies the JWT token on every protected route:
```js
// Usage
router.get('/dashboard', protect, controller);
```

**`authorize(...roles)`** — Restricts access to specific roles:
```js
// Usage — Admin only
router.get('/admin/claims', protect, authorize('ADMIN'), controller);

// Usage — Provider only
router.post('/medical-records', protect, authorize('PROVIDER'), controller);
```

**Token lifecycle:**
1. User logs in via `POST /api/auth/login`
2. Server returns a signed JWT
3. Client stores token and attaches it as `Authorization: Bearer <token>` on all subsequent requests
4. On `401` response, the frontend auto-logs out the user

---

## Error Handling

All API errors follow a consistent JSON structure:

```json
{
  "message": "Human-readable error description",
  "status": 401
}
```

| Status Code | Meaning |
|-------------|---------|
| `200` | Success |
| `201` | Resource created |
| `400` | Bad request / validation error |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — insufficient role |
| `404` | Resource not found |
| `500` | Internal server error |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feature/your-feature-name`
5. Open a Pull Request against `develop`

**Branch naming convention:**
- `feature/` — new features
- `fix/` — bug fixes
- `docs/` — documentation changes
- `refactor/` — code refactoring

---


