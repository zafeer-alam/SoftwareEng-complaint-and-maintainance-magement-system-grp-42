# Frontend-Backend Integration Guide

## Overview
Your Campus Complaint & Maintenance Management System is now fully integrated with REST API connections between the frontend HTML and Express backend.

## Architecture
```
Frontend (HTML/JS) ←→ Backend API (Express) ←→ MongoDB
```

## Setup Instructions

### 1. Backend Setup

#### Prerequisites
- Node.js 14+ installed
- MongoDB instance (local or Atlas)
- npm or yarn package manager

#### Installation Steps

1. Navigate to backend directory:
```bash
cd backend
npm install
```

2. Create a `.env` file in the `backend` directory:
```env
MONGO_URI=mongodb://localhost:27017/campus-complaints
JWT_SECRET=your-secret-key-here
PORT=5000
```

**For MongoDB Atlas:** Replace `MONGO_URI` with:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/campus-complaints
```

3. Start the backend server:
```bash
npm start
# or with nodemon for development
npx nodemon server.js
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

No build process needed! The frontend is a single HTML file.

1. Open the frontend file in a browser:
```bash
# Option 1: Direct file access
open frontend/campus_complaint_system.html

# Option 2: Using Python HTTP Server
cd frontend
python -m http.server 8000
# Then visit http://localhost:8000/campus_complaint_system.html

# Option 3: Using Node HTTP Server
cd frontend
npx http-server
```

### 3. API Configuration

The API base URL is set in the frontend JavaScript:
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

To change it to a deployed backend, update this line in the HTML file.

## Authentication Flow

### Login
1. User enters email/password on the login modal
2. Frontend calls `POST /api/auth/login` with credentials
3. Backend returns JWT token and user data
4. Token is stored in localStorage and used for subsequent requests
5. User is routed to appropriate dashboard (admin/staff/user)

### Token Management
- Tokens are automatically included in all API requests via the `Authorization: Bearer <token>` header
- Tokens expire in 7 days
- On expiration, user will need to login again

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with email/password

### Complaints
- `POST /api/complaints` - Create new complaint (requires auth)
- `GET /api/complaints` - Get all complaints (admin only)
- `GET /api/complaints/:id` - Get single complaint detail
- `GET /api/complaints/user/:userId` - Get user's complaints
- `PUT /api/complaints/:id` - Update complaint (status, assignment)
- `DELETE /api/complaints/:id` - Delete complaint (admin only)
- `GET /api/complaints/pending-for-staff` - Get assigned tasks (staff)
- `GET /api/complaints/resolved` - Get completed tasks

## Test Accounts

After seeding the database, use these demo accounts:

### Admin
- Email: `admin@e.com`
- Password: `admin123`
- Role: Admin

### Staff
- Email: `staff@e.com`
- Password: `staff123`
- Role: Staff (Maintenance)

### Student/User
- Email: `user@e.com`
- Password: `user123`
- Role: User

## Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String (hashed),
  role: "user" | "staff" | "admin",
  createdAt: Date,
  updatedAt: Date
}
```

### Complaints Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  subject: String,
  description: String,
  category: String,
  location: String,
  priority: "Low" | "Medium" | "High" | "Critical",
  status: "Pending" | "In Progress" | "Resolved",
  assignedTo: ObjectId (ref: User, staff member),
  attachments: [String],
  createdAt: Date,
  updatedAt: Date
}
```

## Features Implemented

### User Dashboard
✅ View personal complaints
✅ Submit new complaints
✅ Track complaint status
✅ Filter and search complaints

### Staff Dashboard
✅ View assigned tasks
✅ Update task status
✅ Mark complaints as resolved
✅ View completed work

### Admin Dashboard
✅ View all complaints (system-wide)
✅ Assign complaints to staff
✅ Filter by status/priority
✅ View statistics and analytics
✅ Generate reports

## Troubleshooting

### Issue: "Cannot reach backend" / CORS Error
**Solution:**
1. Ensure backend is running: `npm start` in backend folder
2. Verify `API_BASE_URL` is correct in frontend
3. Check MongoDB connection in backend logs
4. Ensure CORS is enabled (it is by default)

### Issue: "Invalid token" error
**Solution:**
1. Clear localStorage and login again
2. Check `JWT_SECRET` matches in backend `.env`
3. Verify token hasn't expired

### Issue: Database connection failed
**Solution:**
1. Check MongoDB is running locally or accessible (Atlas)
2. Verify `MONGO_URI` in `.env` is correct
3. Check credentials for MongoDB Atlas

### Issue: Complaints not showing after submission
**Solution:**
1. Verify user is logged in with correct token
2. Check browser console for API errors
3. Verify MongoDB has correct data in complaintsCollection
4. Try refreshing the page

## Deployment

### Frontend Deployment
- Deploy HTML file to: Netlify, Vercel, GitHub Pages, or any static hosting
- No build process needed

### Backend Deployment
- Deploy to: Render, Railway, Heroku, AWS, or any Node.js hosting
- Update `API_BASE_URL` in frontend to point to deployed backend
- Use MongoDB Atlas for database
- Update environment variables on hosting platform

## Next Steps

1. **Seed Demo Data:** Create staff and user accounts in MongoDB
2. **Test Workflows:** Test each role (student, staff, admin)
3. **Customize Categories:** Update complaint categories in your form
4. **Add Features:** Email notifications, file uploads, etc.
5. **Deploy:** Push to production hosting

## Support

Check the browser console (F12 → Console) for debugging information and API errors.
