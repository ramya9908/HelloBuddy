# HelloBuiddy - Social Engagement Platform

A full-stack social engagement platform with user authentication, earnings management, and admin controls.

## 🚀 Live Demo

comingg soon........


## 🛠 Tech Stack

**Frontend:** React + TypeScript + Vite + Tailwind CSS  
**Backend:** Node.js + Express + MySQL  
**Deployment:** Netlify (Frontend) + Render (Backend)

## 📁 Project Structure

```
HelloBuiddy/
├── src/                    # Frontend (React + TypeScript)
├── server/                 # Backend (Node.js + Express)
├── package.json           # Frontend dependencies
└── README.md             # This file
```

## ⚡ Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/shivas1432/HelloBuiddy.git
cd HelloBuiddy

# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

### 2. Environment Setup

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3001
```

**Backend (server/.env):**
```env
NODE_ENV=development
PORT=3001
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
DB_HOST=localhost
DB_PORT=3306
DB_NAME=hellobuiddy
DB_USER=your_db_user
DB_PASS=your_db_password
```

### 3. Start Development

**Terminal 1 - Frontend:**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 - Backend:**
```bash
cd server
npm run dev
# Runs on http://localhost:3001
```

## ✨ Features

### User Features
- 🔐 Secure authentication with email verification
- 💰 Real-time earnings dashboard
- 💸 Withdrawal requests and history
- 📊 Interactive charts and analytics

### Admin Features
- 📈 Platform analytics dashboard
- 👥 User management system
- 📝 Post and content management
- ✅ Click approval system
- 💳 Withdrawal request processing

## 🚀 Deployment

### Frontend (Netlify)
1. Connect GitHub repository to Netlify
2. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`

### Backend (Render)
1. Create new Web Service on Render
2. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Add production environment variables

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### User Routes
- `GET /api/user/dashboard` - User dashboard data
- `GET /api/user/earnings` - Earnings history
- `POST /api/user/withdraw` - Create withdrawal request

### Admin Routes
- `GET /api/admin/dashboard` - Admin analytics
- `GET /api/admin/users` - User management
- `GET /api/admin/withdrawals` - Withdrawal management

## 🔧 Scripts

### Frontend
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview build
```

### Backend
```bash
npm start        # Production server
npm run dev      # Development with nodemon
```

## 🗄️ Database Schema

**Main Tables:**
- `users` - User accounts and authentication
- `earnings` - User earning records
- `withdrawals` - Withdrawal requests
- `posts` - Platform content

## 🛡️ Security

- JWT authentication with secure cookies
- BCrypt password hashing
- Rate limiting protection
- CORS configuration
- Input validation

## 👨‍💻 Author

**Shiva** - [@shivas1432](https://github.com/shivas1432)

---

**Repository**: [HelloBuiddy](https://github.com/shivas1432/HelloBuiddy)  
**License**: Private
