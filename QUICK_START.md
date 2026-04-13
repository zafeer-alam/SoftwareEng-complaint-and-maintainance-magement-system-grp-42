# Campus Complaint & Maintenance Management System

A modern, full-stack web application for managing campus complaints and maintenance requests with role-based access control.

## 🎯 Quick Start

### Prerequisites
- ✅ Node.js 14+
- ✅ MongoDB (local or Atlas)
- ✅ Browser with modern JavaScript support

### 1️⃣ Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with:
MONGO_URI=mongodb://localhost:27017/campus-complaints
JWT_SECRET=your-secret-key
PORT=5000

# Start the server
npm start
```

Backend will run on: `http://localhost:5000`

### 2️⃣ Open Frontend

```bash
# Option A: Direct file (simplest)
# Just open: frontend/campus_complaint_system.html in your browser

# Option B: Local server
cd frontend
npx http-server -p 8000
# Then visit: http://localhost:8000/campus_complaint_system.html
```

### 3️⃣ Login

Use one of the demo accounts:
- **Admin**: `admin@e.com` / `admin123`
- **Staff**: `staff@e.com` / `staff123`
- **User**: `user@e.com` / `user123`

## 📋 Features

### 👤 User Role
- Submit complaints with category, location, priority
- Track complaint status in real-time
- View history of all submitted complaints
- Filter and search complaints
- Receive status updates

### 👨‍🔧 Staff Role
- View assigned maintenance tasks
- Update task progress
- Mark tasks as resolved
- View work history and performance stats

### 🛡️ Admin Role
- View system-wide complaints dashboard
- Assign complaints to staff members
- Monitor resolution status
- Generate reports and analytics
- Filter by category, priority, status

## 🏗️ Project Structure

```
complaint-and-maintainance-management-system/
├── backend/
│   ├── src/
│   │   ├── config/         # Database config
│   │   ├── models/         # MongoDB schemas
│   │   │   ├── User.js
│   │   │   └── Complaint.js
│   │   ├── controllers/    # Business logic
│   │   ├── middleware/     # Auth & validation
│   │   │   └── auth.js     # JWT authentication
│   │   └── routes/         # API endpoints
│   │       ├── authRoutes.js
│   │       ├── complaintRoutes.js
│   │       └── reportRoutes.js
│   ├── server.js           # Express app entry
│   ├── package.json
│   └── .env               # Environment config
│
├── frontend/
│   └── campus_complaint_system.html  # Single-file SPA
│
├── design/                # UI/UX designs
├── INTEGRATION_GUIDE.md   # Detailed setup guide
├── start.ps1             # Windows quick start script
└── README.md             # This file
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/register      Register new account
POST   /api/auth/login         Login with credentials
```

### Complaints
```
GET    /api/complaints         Get all complaints (admin)
GET    /api/complaints/:id     Get complaint details
GET    /api/complaints/user/:id Get user's complaints
POST   /api/complaints         Create new complaint
PUT    /api/complaints/:id     Update complaint
DELETE /api/complaints/:id     Delete complaint (admin)
GET    /api/complaints/pending-for-staff   Get assigned tasks
GET    /api/complaints/resolved Get completed tasks
```

## 🎨 Technology Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS variables
- **Vanilla JavaScript** - No framework dependencies
- **Fetch API** - REST API communication

### Backend
- **Node.js** - Runtime environment
- **Express.js** - REST API framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for data modeling
- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing

## 📊 Database Schema

### Users
- Stores admin, staff, and user accounts
- Passwords hashed with bcryptjs
- Roles: user, staff, admin

### Complaints
- Submitted by users
- Assigned to staff members
- Track status through lifecycle
- Record creation/update timestamps

### Relationships
- User 1 → N Complaints
- Staff 1 → N Assignments
- Complaint 1 → 1 Assignment

## 🚀 Deployment

### Frontend
- Deploy HTML file to: **Netlify**, **Vercel**, **GitHub Pages**
- Update `API_BASE_URL` to point to deployed backend
- No build process needed!

### Backend
- Deploy Node.js to: **Render**, **Railway**, **Heroku**, **AWS**
- Use MongoDB Atlas for database
- Set environment variables on hosting platform

## 🔐 Security Features

✅ JWT-based authentication (7-day expiration)
✅ Password hashing with bcryptjs
✅ Role-based access control
✅ CORS enabled for API
✅ Input validation on backend
✅ Protected routes requiring authentication

## 📝 Environment Variables

### Backend (.env)
```env
MONGO_URI=mongodb://localhost:27017/campus-complaints
JWT_SECRET=your-secret-key-min-16-chars
PORT=5000
NODE_ENV=development
```

### Frontend (Hardcoded in HTML)
```javascript
const API_BASE_URL = 'http://localhost:5000/api';
```

## 🐛 Troubleshooting

### Backend won't start
```
❌ Error: connect ECONNREFUSED
✅ Solution: Make sure MongoDB is running
```

### CORS errors in frontend
```
❌ Error: Access-Control-Allow-Origin missing
✅ Solution: Backend CORS is enabled - check API_BASE_URL is correct
```

### Login fails
```
❌ Error: User not found
✅ Solution: Create accounts in MongoDB or use demo accounts
```

### API calls return 401
```
❌ Error: Invalid token
✅ Solution: Clear localStorage and login again
```

## 📞 Support & Contact

For issues or suggestions, check:
1. [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) - Detailed setup
2. Browser Console (F12) - API errors
3. Backend server logs - Connection issues

## 📄 License

MIT License - Free to use and modify

## 🎓 Learning Resources

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [JWT Authentication](https://jwt.io/)
- [REST API Best Practices](https://restfulapi.net/)

---

**Made with ❤️ for Campus Maintenance**

Happy coding! 🚀
