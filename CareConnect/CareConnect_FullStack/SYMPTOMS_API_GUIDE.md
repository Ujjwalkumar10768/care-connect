# Symptoms Form API - Examples & Testing Guide

## Complete Integration Summary

Your symptoms form is now fully integrated with the CareConnect backend. Here's everything you need to know:

---

## 🎯 Quick Start

### Start Backend
```bash
cd backend
npm start
```

### Start Frontend
```bash
cd frontend
npm run dev
```

### Access Form
- URL: `http://localhost:5173/symptoms`
- Or click "SYMPTOMS" in navbar

---

## 📡 API Endpoints

### 1. Submit Symptoms (Main Endpoint)

**Endpoint:** `POST /api/user/submit-symptoms`

**Authentication:** Required (Bearer Token)

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'token': 'your_jwt_token_here'
}
```

**Request Body:**
```javascript
{
  symptoms: "Fever, Cough, Sore Throat",
  duration: "1-3 days",
  severity: "moderate",
  otherInfo: "Started after flu exposure"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:4000/api/user/submit-symptoms \
  -H "Content-Type: application/json" \
  -H "token: your_jwt_token" \
  -d '{
    "symptoms": "Fever, Cough",
    "duration": "1-3 days",
    "severity": "moderate",
    "otherInfo": "Getting worse"
  }'
```

**Success Response (200):**
```javascript
{
  success: true,
  message: "Symptoms submitted successfully",
  symptomId: "507f1f77bcf86cd799439011"
}
```

**Error Response:**
```javascript
{
  success: false,
  message: "Symptoms and duration are required"
}
```

---

### 2. Get Symptoms History

**Endpoint:** `GET /api/user/get-symptoms`

**Authentication:** Required

**Headers:**
```javascript
{
  'token': 'your_jwt_token_here'
}
```

**Curl Example:**
```bash
curl -X GET http://localhost:4000/api/user/get-symptoms \
  -H "token: your_jwt_token"
```

**Response:**
```javascript
{
  success: true,
  symptomsData: [
    {
      _id: "507f1f77bcf86cd799439011",
      userId: "507f1f77bcf86cd799439010",
      symptoms: "Fever, Cough",
      duration: "1-3 days",
      severity: "moderate",
      otherInfo: "Getting worse",
      status: "pending",
      doctorNotes: "",
      createdAt: "2026-01-18T10:30:00.000Z",
      updatedAt: "2026-01-18T10:30:00.000Z"
    }
  ]
}
```

---

### 3. Get Single Symptom Record

**Endpoint:** `POST /api/user/get-single-symptom`

**Authentication:** Required

**Headers:**
```javascript
{
  'Content-Type': 'application/json',
  'token': 'your_jwt_token_here'
}
```

**Request Body:**
```javascript
{
  symptomId: "507f1f77bcf86cd799439011"
}
```

**Curl Example:**
```bash
curl -X POST http://localhost:4000/api/user/get-single-symptom \
  -H "Content-Type: application/json" \
  -H "token: your_jwt_token" \
  -d '{ "symptomId": "507f1f77bcf86cd799439011" }'
```

**Response:**
```javascript
{
  success: true,
  symptomData: {
    _id: "507f1f77bcf86cd799439011",
    userId: "507f1f77bcf86cd799439010",
    symptoms: "Fever, Cough",
    duration: "1-3 days",
    severity: "moderate",
    otherInfo: "Getting worse",
    status: "pending",
    doctorNotes: "",
    createdAt: "2026-01-18T10:30:00.000Z"
  }
}
```

---

## 📋 Frontend Implementation

### Component Location
```
frontend/src/pages/SymptomsForm.jsx
```

### Usage in Frontend
```jsx
import SymptomsForm from './pages/SymptomsForm'

// Already integrated in App.jsx
// Route: /symptoms
```

### How It Works
1. User fills out form
2. Validation checks for required fields
3. API call with token authentication
4. Backend validates and saves
5. Success/Error toast shown
6. Redirect to appointments on success

---

## 🗄️ Database Schema

### Symptoms Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                    // Reference to user
  symptoms: String,                    // "Fever, Cough"
  duration: String,                    // "1-3 days"
  severity: String,                    // "mild" | "moderate" | "severe"
  otherInfo: String,                   // Optional additional info
  status: String,                      // "pending" | "reviewed" | "resolved"
  doctorNotes: String,                 // Doctor's response
  createdAt: Date,                     // Auto timestamp
  updatedAt: Date                      // Auto timestamp
}
```

---

## 🔐 Authentication

### Token Flow
1. User logs in
2. Backend returns JWT token
3. Frontend stores token in localStorage
4. All API calls include token in headers
5. Backend `authUser` middleware validates token
6. `userId` extracted from token and attached to request

### Required Header Format
```
token: <JWT_TOKEN_STRING>
```

---

## ✅ Validation Rules

### Frontend Validation
- Symptoms field cannot be empty
- Duration must be selected
- Severity must be one of: mild, moderate, severe

### Backend Validation
- Symptoms required
- Duration required
- Severity must be in ['mild', 'moderate', 'severe']
- User must exist in database
- Token must be valid

---

## 🧪 Testing Steps

### Step 1: Register User
```bash
POST /api/user/register
{
  name: "John Doe",
  email: "john@example.com",
  password: "password123"
}
```
Response: `{ success: true, token: "jwt_token" }`

### Step 2: Save Token
```javascript
localStorage.setItem('token', 'jwt_token')
```

### Step 3: Submit Symptoms
```bash
POST /api/user/submit-symptoms
Headers: { token: "jwt_token" }
Body: {
  symptoms: "Fever",
  duration: "1-3 days",
  severity: "moderate",
  otherInfo: "Feeling sick"
}
```

### Step 4: Retrieve Symptoms
```bash
GET /api/user/get-symptoms
Headers: { token: "jwt_token" }
```

---

## 🐛 Troubleshooting

### Issue: "Not Authorized Login Again"
**Solution:** Make sure token is included in headers

### Issue: "Symptoms and duration are required"
**Solution:** Fill out all required fields in form

### Issue: "User not found"
**Solution:** Token might be invalid, try logging in again

### Issue: Form not appearing in navbar
**Solution:** Restart frontend dev server

### Issue: API call fails
**Solution:** 
- Check backend is running on port 4000
- Check CORS is enabled
- Check MongoDB is connected

---

## 📊 Status Values

Users' symptom submissions can have these statuses:

- **pending**: Initially submitted, awaiting doctor review
- **reviewed**: Doctor has reviewed the symptoms
- **resolved**: Doctor has provided guidance/treatment

---

## 🔄 Future Enhancements

### For Doctor Interface
```javascript
// Update symptom status (Admin/Doctor only)
PATCH /api/doctor/symptom/:id
{
  status: "reviewed",
  doctorNotes: "Patient shows signs of common cold..."
}
```

### For Recommendations
```javascript
// Get recommended doctors based on symptoms
GET /api/user/recommended-doctors/:symptomId
```

---

## 📞 Support

If you encounter any issues:

1. Check error console (Frontend: F12 → Console)
2. Check server logs (Backend terminal)
3. Verify all files are created correctly
4. Ensure MongoDB is running
5. Check network tab in browser DevTools

---

## ✨ All Components Connected

```
Frontend Form
    ↓
SymptomsForm.jsx (Validation)
    ↓
API Call with Token
    ↓
authUser Middleware
    ↓
submitSymptoms Controller
    ↓
symptomsModel.save()
    ↓
MongoDB Storage
    ↓
Response to Frontend
    ↓
Toast & Redirect
```

---

**Everything is ready to use! 🎉**
