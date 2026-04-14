# Campus Complaint & Maintenance Management System

A full-stack web application for managing campus maintenance complaints, built with Node.js, Express, MongoDB, and a responsive HTML/CSS/JavaScript frontend.

## Overview

This system allows students and staff to submit maintenance complaints, track their status, and enables administrators and maintenance staff to manage assignments and resolutions. The backend provides RESTful APIs for authentication, complaint management, and analytics.

## Features Implemented

### Backend Features
- **Authentication & Authorization**
  - User registration and login with JWT tokens
  - Role-based access control (user, staff, admin)
  - Secure password hashing with bcrypt
  - Token expiration and validation

- **Complaint Management**
  - Create complaints with subject, description, category, location, priority
  - View complaints (user-specific or admin all)
  - Filter complaints by status, category, user
  - Assign complaints to staff (admin only)
  - Update complaint status (staff)
  - Delete complaints (admin only)

- **Admin Analytics & Reports**
  - Complaint status summary
  - Category breakdown
  - Staff performance reports
  - Monthly complaint volume

- **Security & Validation**
  - Input validation for all endpoints
  - Proper error handling with JSON responses
  - CORS support for frontend integration
  - Environment variable configuration

### Frontend Features
- Responsive dashboard for students/staff/admin
- User registration, login, and JWT-based authentication
- Complaint submission integrated with backend API
- Complaint listing, filtering, and status tracking
- Modal dialogs for complaint details and actions
- Toast notifications and live dashboard updates

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **cors** - Cross-origin resource sharing

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling (custom responsive design)
- **JavaScript** - Interactivity

### Development Tools
- **Git** - Version control
- **npm** - Package management

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd complaint-and-maintainance-magement-system
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Environment Setup**
   - Copy `.env.example` to `.env` in the `backend` folder
   - Get your own MongoDB credentials:
     1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
     2. Create a cluster and database
     3. Create a database user with username and password
     4. Copy the connection string
   - Update `/backend/.env` with your credentials:
     ```
     MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/complaintDB
     JWT_SECRET=your_secure_jwt_secret_here
     ```
   - **Important**: Never commit `.env` file to git (already in `.gitignore`)

4. **Start MongoDB**
   - Ensure MongoDB Atlas cluster is running or local MongoDB is installed

5. **Run the backend**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

6. **Open the frontend**
   - Open `frontend/campus_complaint_system.html` in a web browser
   - Or serve it with a local server such as `npx http-server` or similar

## Usage

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

#### Complaints
- `POST /api/complaints` - Create new complaint (authenticated)
- `GET /api/complaints` - List complaints (with optional filters)
- `GET /api/complaints/user/:userId` - Get user's complaints
- `GET /api/complaints/:id` - Get specific complaint
- `PUT /api/complaints/assign/:id` - Assign complaint to staff (admin)
- `PUT /api/complaints/status/:id` - Update complaint status (staff)
- `DELETE /api/complaints/:id` - Delete complaint (admin)

#### Reports (Admin Only)
- `GET /api/reports/summary` - Complaint status summary
- `GET /api/reports/categories` - Category breakdown
- `GET /api/reports/staff/:id` - Staff performance
- `GET /api/reports/monthly` - Monthly volume

### Example API Usage

**Register a user:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"password123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```

**Create complaint:**
```bash
curl -X POST http://localhost:5000/api/complaints \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"subject":"AC not working","description":"Room AC is broken","category":"Electrical","location":"Hostel A Room 101","priority":"High"}'
```

## Project Structure

```
complaint-and-maintainance-magement-system/
├── README.md
├── .gitignore
├── .env.example
├── backend/
│   ├── package.json
│   ├── server.js
│   └── src/
│       ├── middleware/
│       │   └── auth.js
│       ├── models/
│       │   ├── User.js
│       │   └── Complaint.js
│       └── routes/
│           ├── authRoutes.js
│           ├── complaintRoutes.js
│           └── reportRoutes.js
└── frontend/
    └── campus_complaint_system.html
```

## Development Notes

### Backend Improvements Made
- Fixed MongoDB connection timing issues
- Added comprehensive error handling
- Implemented role-based permissions
- Added input validation and sanitization
- Created admin analytics endpoints
- Improved JWT token handling with expiration

### Frontend Integration
The HTML frontend is connected to the backend API and includes:

1. JWT authentication with login/register flows
2. Complaint creation and user-specific complaint listing
3. Dashboard and complaint counts that refresh after actions
4. Role-aware navigation for users, staff, and admins

### Security Considerations
- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt
- Admin routes are protected with role checks
- Input validation prevents injection attacks
