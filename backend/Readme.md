# Amity Lost & Found — Backend

REST API for the Amity University Lost & Found Management System.

## Tech Stack

- Node.js + Express
- MongoDB (Mongoose)
- JWT Authentication
- Nodemailer (OTP emails)
- Socket.io

## Setup
```bash
npm install
```

Create a `.env` file:
```env
PORT=5000
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your_email
EMAIL_PASS=your_app_password
NODE_ENV=development
```
```bash
npm run dev
```

## Build
```bash
npm start
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Student registration |
| POST | /api/auth/login | Student login |
| POST | /api/auth/verify-otp | Email verification |
| POST | /api/auth/forgot-password | Request reset OTP |
| POST | /api/auth/reset-password | Reset password |
| POST | /api/auth/admin-login | Admin login |
| GET | /api/lostitems/my | Get my lost items |
| POST | /api/lostitems | Report lost item |
| POST | /api/founditems | Add found item |
| GET | /api/founditems/department | Department found items |
| GET | /api/matches/stats | Match statistics |
| GET | /api/notifications | Get notifications |