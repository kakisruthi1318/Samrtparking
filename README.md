# 🚗 Smart Parking Finder

### Real-Time Parking Slot Management and Reservation System

Smart Parking Finder is a full-stack web application developed using the **MERN Stack** to help drivers find, view, and reserve available parking slots in real time. The system provides live parking updates, secure reservations, and efficient parking management while preventing double booking.

## 📌 Problem Statement

Urban drivers waste valuable time searching for parking because parking slot availability is not transparent. Traditional parking systems often lack real-time updates and efficient reservation management.

Smart Parking Finder provides a digital solution that allows users to view available parking slots, reserve parking spaces, and manage their reservations efficiently.

## ✨ Key Features

- 🔐 User Registration and Secure Login
- 🚘 Real-Time Parking Slot Availability
- 🟢 Green – Available Parking Slots
- 🔴 Red – Occupied Parking Slots
- 🟡 Amber – Reserved Parking Slots
- 📅 Online Parking Slot Reservation
- ⏳ Automatic Reservation Expiration After 15 Minutes
- ❌ Reservation Cancellation Within 5 Minutes
- 👤 Maximum 2 Active Reservations Per User
- 📍 Parking Check-In and Completion
- 🔄 Live Updates Using Socket.IO
- 🛡️ ACID Transactions to Prevent Double Booking
- 📊 Dashboard with Parking Statistics
- 📋 Individual Reservation History

## 🛠️ Technology Stack

**Frontend**
- React.js
- Vite
- Tailwind CSS
- JavaScript
- Axios
- React Router
- Lucide React
- Recharts

**Backend**
- Node.js
- Express.js
- REST API
- Socket.IO
- JWT Authentication
- bcryptjs

**Database**
- MongoDB
- Mongoose

## 🏗️ Project Architecture

```text
smart-parking-finder/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── context/
│   │   └── services/
│   └── package.json
│
├── server/
│   ├── config/
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   ├── sockets/
│   └── jobs/
│
├── tests/
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## ⚙️ Functional Requirements

| Requirement | Description |
|---|---|
| Real-Time Updates | Parking status updates through Socket.IO |
| Reservation Expiry | Expires after 15 minutes without check-in |
| Maximum Reservations | Maximum 2 active reservations per driver |
| Cancellation | Allowed within 5 minutes of booking |
| Double Booking Prevention | MongoDB ACID transactions |
| Slot Status | Available, Reserved, Occupied |
| Separate Reservation Storage | Dedicated MongoDB collection |

## 🗄️ Database Collections

**1. Users**
- User ID
- Name
- Email
- Password
- Created At

**2. Parking Slots**
- Slot ID
- Slot Number
- Parking Status
- Vehicle Type
- Price Per Hour

**3. Reservations**
- Reservation ID
- User ID
- Slot ID
- Booking Time
- Check-In Deadline
- Check-In Time
- Cancellation Deadline
- Reservation Status

## 🚀 Installation and Setup

### Prerequisites

Install the following:
- Node.js
- MongoDB
- Visual Studio Code
- Git

### Step 1: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/smart-parking-finder.git
```

### Step 2: Open the Project

```bash
cd smart-parking-finder
code .
```

### Step 3: Install Dependencies

```bash
npm install
npm run install:all
```

### Step 4: Configure Environment Variables

Create a `.env` file inside the server folder using the `.env.example` file as a reference.

Example:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/smart_parking?replicaSet=rs0
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

Use a MongoDB replica set because multi-document ACID transactions require replica-set support.

For a local single-node replica set, configure MongoDB with replica-set name `rs0` and initialize it using:

```javascript
rs.initiate()
```

### Step 5: Seed the Database

```bash
npm run seed
```

### Step 6: Start the Application

```bash
npm run dev
```

Open your browser and visit:

Frontend: http://localhost:5173

Backend: http://localhost:5000

*Note: These commands assume the scripts are configured as described in the project package.json files.*

## 🔒 Security Features

- Password hashing using bcryptjs.
- JWT-based authentication.
- Protected API routes.
- Secure cookie handling.
- Input validation.
- User-specific reservation access.
- MongoDB transaction-based reservation management.

## 🎯 Project Objectives

1. Develop a real-time parking slot management system.
2. Reduce the time spent searching for parking spaces.
3. Prevent duplicate reservations and booking conflicts.
4. Implement secure user authentication.
5. Provide efficient parking reservation and cancellation.
6. Improve parking space utilization through digital management.

## 🔮 Future Enhancements

- GPS-based nearby parking discovery
