# AmiFound

## Amity University Gwalior Lost & Found System

AmiFound is a secure, role-based lost and found management platform built
solely for **Amity University Gwalior**. It gives students and university
staff one place to report lost belongings, register found items, coordinate
recovery, and track the status of each item.

> **Operational status:** This system is currently being used by Amity
> University Gwalior.

The project was created by **Satyam Tomar** for the university's operational
needs. It is designed around the university's departments, blocks, hostels,
campus locations, and security-office workflow.

## What the system provides

### Student experience

- Register with an official Amity email address and verify the account with an
  OTP.
- Complete an academic and contact profile.
- Report a lost item with category, description, color, condition, location,
  and date information.
- View and manage personally reported lost items.
- Receive notifications when a possible match is found.
- Self-resolve an item when it is recovered independently.
- Reset a forgotten password through an email OTP flow.

### University operations

- Admin and security staff can register found items and attach photographs.
- Search and filter lost and found records by department and other item
  details.
- Match found items to one or more active lost-item reports.
- Notify students in real time through Socket.IO when a match or status change
  occurs.
- Record returned, collected offline, unclaimed, matched, and self-resolved
  item states.
- Transfer older found items from a block workflow to the University Security
  Office through a scheduled background job, while notifying affected users.
- Provide management analytics and oversight for directors.
- Allow super administrators to manage department assignments and review
  assignment history.

## Role model

| Role | Main responsibility |
| --- | --- |
| Student | Report and track personal lost items and recovery |
| Admin | Manage found items for assigned university departments/blocks |
| Security | Handle security-office inventory and unclaimed items |
| Director | View institution-level operational data and analytics |
| Super admin | Manage staff assignments and elevated administration |

## Architecture

```text
frontend/AmiFound (React + Vite)
              |
              | HTTPS/REST + Socket.IO
              v
backend (Node.js + Express)
              |
      +-------+---------+----------------+
      |                 |                |
   MongoDB          Cloudinary       Email/OTP
```

### Frontend

- React 18 with Vite
- React Router for protected, role-specific routes
- React Hook Form and Zod for form handling and validation
- TanStack React Query for server-state access
- Responsive CSS modules and shared UI components

### Backend

- Node.js with Express 5
- MongoDB with Mongoose
- JWT access and refresh-session authentication
- Helmet, CORS, request IDs, structured logging, and rate limiting
- Socket.IO for real-time user notifications
- Cloudinary for item-image storage
- Nodemailer and Google APIs for email delivery
- Node-cron for scheduled item-transfer processing

## Main application areas

### Frontend routes

- `/` - public AmiFound landing page
- `/login` and `/register` - authentication
- `/complete-profile` - student profile completion
- `/student-dashboard` - student workflow
- `/admin-dashboard` - department admin workflow
- `/security-dashboard` - security workflow
- `/director-dashboard` - director workflow
- `/super-admin-dashboard` - super administrator workflow
- `/super-admin/departments` - department assignment management

### API areas

All protected application resources require authentication and are subject to
role checks where applicable.

- `/api/auth` - registration, OTP verification, login, refresh, logout,
  profile, and password reset
- `/api/lostitems` - student lost-item reports and self-resolution
- `/api/founditems` - staff found-item intake, search, recovery, and status
- `/api/matches` - lost/found match inspection and statistics
- `/api/notifications` - user notifications and read state
- `/api/upload` - secured single and multiple image uploads
- `/api/management` - analytics, oversight lists, and super-admin actions
- `/api/admin-management` - department assignments and history
- `/api/health/live` and `/api/health/ready` - deployment health probes

## Repository layout

```text
.
├── backend/
│   ├── src/app/                 # Express app, routes, Socket.IO, server
│   ├── src/config/              # Environment and application constants
│   ├── src/modules/             # Auth, items, matching, notifications, uploads
│   ├── src/jobs/                # Scheduled item-transfer processing
│   └── src/shared/              # Database, health, middleware, validation
├── frontend/AmiFound/
│   ├── src/app/                 # Application shell and protected routes
│   ├── src/features/            # Auth, student, management, and admin features
│   └── src/shared/              # Shared components, pages, and styles
├── load-tests/                  # Safe, authenticated k6 smoke-load scenarios
└── .github/workflows/ci.yml    # Backend tests, frontend lint, and build
```

## Local development

### Prerequisites

- Node.js 24 or a compatible current Node.js release
- MongoDB (local or a dedicated test/development database)
- Cloudinary account for image uploads
- SMTP/Google email configuration for OTP messages

### Start the backend

```powershell
cd backend
npm install
```

Create `backend/.env` using the variables and deployment notes in
[backend/Readme.md](backend/Readme.md). Use placeholder values for local
development and never commit real secrets.

```powershell
npm run dev
```

The API listens on port `5000` when `PORT=5000` is configured.

### Start the frontend

In a second terminal:

```powershell
cd frontend/AmiFound
npm install
npm run dev
```

Configure the frontend's API base URL using the existing frontend environment
configuration before connecting it to a non-local backend.

### Production commands

```powershell
# Backend
cd backend
npm ci
npm start

# Frontend
cd frontend/AmiFound
npm ci
npm run build
```

The included Vercel rewrite configuration supports SPA navigation. The
backend is structured for a managed Node deployment with MongoDB, Cloudinary,
and the required email provider.

## Testing and quality checks

The GitHub Actions workflow runs on pushes and pull requests:

- Backend: `npm ci` followed by `npm test`
- Frontend: `npm ci`, `npm run lint`, and `npm run build`

Run the same checks locally:

```powershell
cd backend
npm test

cd ..\frontend\AmiFound
npm run lint
npm run build
```

Optional authenticated smoke-load scenarios are documented in
[load-tests/README.md](load-tests/README.md). They are intended for a
disposable test database and must not use production credentials or real
student data.

## Security and privacy notes

- Keep all secrets in environment variables; do not commit `.env` files.
- Use a separate database and test account for local or load testing.
- Production origins must use an exact HTTPS `CLIENT_URL`; wildcard origins
  are not supported.
- Authentication, role authorization, validation, upload type/size controls,
  rate limiting, Helmet, and secure cookies protect the application boundary.
- Treat student profiles, item descriptions, photographs, and email
  addresses as private university data.

## Project credits

- **Developed by:** Satyam Tomar
- **Mentor:** Dr. Ashok Kumar Shrivastava
- **Institution:** Amity University Gwalior

For technical issues, contact the project maintainer through the contact
details configured for the university deployment rather than adding
credentials or private operational data to this repository.

