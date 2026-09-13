Here is the updated README section with your actual env variables and cleaner setup.

# Amity Lost & Found — Backend

REST API for the Amity University Lost & Found Management System.

## Tech Stack

* Node.js
* Express.js
* MongoDB + Mongoose
* JWT Authentication
* Socket.io
* Cloudinary
* Nodemailer

---

# Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file in the root directory:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection_string

NODE_ENV=development
CORS_ORIGIN=*

JWT_SECRET=your_jwt_secret
JWT_EXPIRE=24h
OTP_EXPIRE=10

CLIENT_ID=your_google_client_id
CLIENT_SECRET=your_google_client_secret
REFRESH_TOKEN=your_google_refresh_token
MY_EMAIL=your_email@gmail.com

CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

Start development server:

```bash
npm run dev
```

Start production server:

```bash
npm start
```

---

# Features

* JWT Authentication
* Email OTP Verification
* Lost Item Reporting
* Found Item Reporting
* AI-based Match Detection
* Real-time Notifications using Socket.io
* Cloudinary Image Upload
* Admin & Security Management
* Match Status Reconciliation
* One-to-Many Matching Support

---

# API Routes

## Health Probes

| Method | Route | Description |
| ------ | ----- | ----------- |
| GET | `/api/health/live` | Lightweight process liveness probe |
| GET | `/api/health/ready` | Readiness probe; returns `503` when MongoDB is unavailable or the server is draining |

## Authentication

| Method | Route                       | Description                |
| ------ | --------------------------- | -------------------------- |
| POST   | `/api/auth/register`        | Register new student       |
| POST   | `/api/auth/login`           | Login user                 |
| POST   | `/api/auth/verify-otp`      | Verify email OTP           |
| POST   | `/api/auth/forgot-password` | Request password reset OTP |
| POST   | `/api/auth/reset-password`  | Reset password             |

---

## Lost Items

| Method | Route                | Description          |
| ------ | -------------------- | -------------------- |
| POST   | `/api/lostitems`     | Submit lost item     |
| GET    | `/api/lostitems/my`  | Get my lost items    |
| GET    | `/api/lostitems/:id` | Get single lost item |

---

## Found Items

| Method | Route                 | Description           |
| ------ | --------------------- | --------------------- |
| POST   | `/api/founditems`     | Add found item        |
| GET    | `/api/founditems`     | Get found items       |
| GET    | `/api/founditems/:id` | Get single found item |

---

## Notifications

| Method | Route                         | Description               |
| ------ | ----------------------------- | ------------------------- |
| GET    | `/api/notifications`          | Get notifications         |
| PATCH  | `/api/notifications/:id/read` | Mark notification as read |

---

## Uploads

| Method | Route                  | Description            |
| ------ | ---------------------- | ---------------------- |
| POST   | `/api/upload/single`   | Upload single image    |
| POST   | `/api/upload/multiple` | Upload multiple images |
| DELETE | `/api/upload/*path`    | Delete uploaded image  |

---

# Notes

* Socket.io is used for real-time notifications.
* Cloudinary is used for image storage.
* Pending uploads are automatically cleaned up.
* Matching system supports multiple matches between lost and found items.
* Admins and Security users have separate management flows.
