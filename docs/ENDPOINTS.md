# AlzCare Platform - API Endpoints Reference

> Backend API documentation for Frontend Integration | Identity Service v1.0 | Feb 2026

---

## Base URLs

| Environment | Base URL |
|-------------|----------|
| **Docker Desktop (Development)** | `http://localhost:8080` |
| **Identity Service (Direct)** | `http://localhost:8001` |
| **Keycloak** | `http://localhost:8090` |

**Note:** All API requests should go through the **Gateway** (port 8080) for proper JWT validation and routing.

---

## Authentication

### Keycloak OAuth2/OIDC Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/realms/alzcare/protocol/openid-connect/token` | POST | Obtain access token |
| `/realms/alzcare/protocol/openid-connect/logout` | POST | Logout user |
| `/realms/alzcare/.well-known/openid-configuration` | GET | OIDC discovery |

**Login Request:**
```http
POST http://localhost:8090/realms/alzcare/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=password
&client_id=alzcare-webapp
&username=admin@example.com
&password=Admin123!
```

**Login Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "token_type": "Bearer"
}
```

### Automatic Token Refresh (Frontend Implementation)

The frontend implements automatic token refresh to prevent 5-minute logout issues.

**Token Configuration:**
| Token Type | Lifespan | Storage |
|------------|----------|---------|
| Access Token | 5 minutes (300s) | localStorage (`access_token`) |
| Refresh Token | 30 minutes (1800s) | localStorage (`refresh_token`) |
| SSO Session | 10 hours max | Keycloak server |

**Refresh Strategy:**
1. **Proactive Refresh:** Before each request, check if access token expires in < 60 seconds → refresh automatically
2. **Reactive Refresh:** On 401 response, attempt refresh once before logging out
3. **Request Queueing:** During refresh, queue concurrent requests and retry with new token

**Token Refresh Request:**
```http
POST http://localhost:8090/realms/alzcare/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&client_id=alzcare-webapp
&refresh_token=<refresh_token>
```

**Refresh Response:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "token_type": "Bearer"
}
```

**Frontend Services:**
| Service | Purpose |
|---------|---------|
| `TokenRefreshService` | JWT expiration tracking, refresh logic, request queueing |
| `AuthInterceptor` | Proactive/reactive refresh, queueing during refresh |
| `AuthService` | Login/logout, token storage, expiration helpers |

**Usage Example:**
```typescript
// Interceptor automatically handles refresh - no manual action needed
this.apiService.getPatient(patientId).subscribe(data => {
  // Token refreshed automatically if needed
});

// Or manually check expiration
if (this.authService.isTokenExpiringSoon(60)) {
  this.authService.refreshToken().subscribe();
}
```

### Required Headers for Authenticated Requests

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

---

## Identity Service APIs

Base path: `/api/v1`

### Admin Profile Management APIs (NEW)

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/admin/profiles/{userId}` | GET | Get user profile (returns Patient/Doctor/Caregiver based on role) | ✅ ADMIN |
| `/admin/profiles/{userId}/patient` | PUT | Update patient profile | ✅ ADMIN |
| `/admin/profiles/{userId}/doctor` | PUT | Update doctor profile | ✅ ADMIN |
| `/admin/profiles/{userId}/caregiver` | PUT | Update caregiver profile | ✅ ADMIN |

#### Get User Profile (Admin)
```http
GET /api/v1/admin/profiles/{userId}
Authorization: Bearer <token>
```

**Response (200 OK) - Patient:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "keycloak-patient-id",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1950-05-15",
  "gender": "MALE",
  "phone": "+1234567890",
  "emergencyContact": "Jane Doe: +0987654321",
  "address": "123 Main St, City, Country",
  "isActive": true,
  "totalPoints": 150,
  "currentStreak": 5,
  "createdAt": "2026-01-15T08:00:00Z",
  "updatedAt": "2026-02-17T14:30:00Z"
}
```

**Response (200 OK) - Doctor:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "keycloak-doctor-id",
  "firstName": "Dr. Ahmed",
  "lastName": "Mehrez",
  "speciality": "Neurology",
  "licenseNumber": "MD-12345",
  "phone": "+1234567890",
  "contact": "clinic@example.com",
  "address": "Medical Center, Floor 3",
  "isAvailable": true,
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-02-17T10:00:00Z"
}
```

**Response (200 OK) - Caregiver:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "userId": "keycloak-caregiver-id",
  "firstName": "Sarah",
  "lastName": "Johnson",
  "phone": "+1234567890",
  "contact": "sarah@example.com",
  "address": "456 Oak Ave, City",
  "isAvailable": true,
  "isProfessional": true,
  "createdAt": "2026-01-20T09:00:00Z",
  "updatedAt": "2026-02-17T11:00:00Z"
}
```

#### Update Patient Profile (Admin)
```http
PUT /api/v1/admin/profiles/{userId}/patient
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1950-05-15",
  "gender": "MALE",
  "phone": "+1234567890",
  "emergencyContact": "Jane Doe: +0987654321",
  "address": "123 Main St, City, Country",
  "isActive": true
}
```

#### Update Doctor Profile (Admin)
```http
PUT /api/v1/admin/profiles/{userId}/doctor
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Dr. Ahmed",
  "lastName": "Mehrez",
  "speciality": "Neurology",
  "licenseNumber": "MD-12345",
  "phone": "+1234567890",
  "contact": "clinic@example.com",
  "address": "Medical Center, Floor 3",
  "isAvailable": true
}
```

#### Update Caregiver Profile (Admin)
```http
PUT /api/v1/admin/profiles/{userId}/caregiver
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Sarah",
  "lastName": "Johnson",
  "phone": "+1234567890",
  "contact": "sarah@example.com",
  "address": "456 Oak Ave, City",
  "isAvailable": true,
  "isProfessional": true
}
```

---

### Patient Profile APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/patients` | POST | Create new patient profile | ✅ DOCTOR/ADMIN |
| `/patients/{keycloakId}` | GET | Get patient by Keycloak ID | ✅ Any role |
| `/patients/{id}` | PUT | Update patient profile | ✅ Own/Assigned |

#### Create Patient Profile
```http
POST /api/v1/patients
Authorization: Bearer <token>
Content-Type: application/json

{
  "keycloakId": "uuid-from-keycloak",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1950-05-15",
  "gender": "MALE",
  "preferredLanguage": "ENGLISH",
  "culturalContext": "Christian, speaks French and English",
  "photoUrl": "https://..."
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "keycloakId": "uuid-from-keycloak",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1950-05-15",
  "gender": "MALE",
  "preferredLanguage": "ENGLISH",
  "culturalContext": "Christian, speaks French and English",
  "photoUrl": "https://...",
  "isActive": true,
  "createdAt": "2026-02-13T10:30:00Z",
  "updatedAt": "2026-02-13T10:30:00Z"
}
```

#### Get Patient by Keycloak ID
```http
GET /api/v1/patients/{keycloakId}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "keycloakId": "abc-123-def",
  "firstName": "Margaret",
  "lastName": "Johnson",
  "dateOfBirth": "1945-06-15",
  "gender": "FEMALE",
  "preferredLanguage": "ENGLISH",
  "culturalContext": "Values family involvement in care decisions",
  "photoUrl": "https://res.cloudinary.com/.../patient-photo.jpg",
  "isActive": true,
  "createdAt": "2026-01-15T08:00:00Z",
  "updatedAt": "2026-02-10T14:30:00Z"
}
```

#### Get All Patients
```http
GET /api/v1/patients?isActive=true
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `isActive` | boolean | No | Filter by active status |

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "keycloak-id-1",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1950-05-15",
    "gender": "MALE",
    "preferredLanguage": "ENGLISH",
    "photoUrl": "https://...",
    "phone": "+1234567890",
    "emergencyContact": "Jane Doe: +0987654321",
    "address": "123 Main St",
    "isActive": true,
    "totalPoints": 150,
    "currentStreak": 5,
    "createdAt": "2026-01-15T08:00:00Z",
    "updatedAt": "2026-02-17T14:30:00Z"
  }
]
```

#### Update Patient Profile
```http
PUT /api/v1/patients/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "preferredLanguage": "FRENCH",
  "photoUrl": "https://new-url.com/photo.jpg"
}
```

---

### Doctor Profile APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/doctors/{id}` | GET | Get doctor by UUID | ✅ Any role |
| `/doctors/user/{userId}` | GET | Get doctor by Keycloak user ID | ✅ Any role |

#### Get Doctor by ID
```http
GET /api/v1/doctors/{id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "keycloak-doctor-id",
  "firstName": "Dr. Ahmed",
  "lastName": "Mehrez",
  "speciality": "Neurology",
  "licenseNumber": "MD-12345-NY",
  "phone": "+1234567890",
  "isAvailable": true,
  "createdAt": "2026-01-10T08:00:00Z",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

---

### Caregiver Profile APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/caregivers/{id}` | GET | Get caregiver by UUID | ✅ Any role |
| `/caregivers/user/{userId}` | GET | Get caregiver by Keycloak user ID | ✅ Any role |

#### Get Caregiver by ID
```http
GET /api/v1/caregivers/{id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "userId": "keycloak-caregiver-id",
  "relationship": "DAUGHTER",
  "experience": "3 years caring for Alzheimer's patients",
  "availability": "Weekdays 8AM-6PM",
  "createdAt": "2026-01-20T09:00:00Z",
  "updatedAt": "2026-02-05T11:00:00Z"
}
```

---

### Autonomy Assessment APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/patients/{patientId}/autonomy` | POST | Create new assessment | ✅ DOCTOR |
| `/patients/{patientId}/autonomy` | GET | Get latest assessment | ✅ Any role |
| `/patients/{patientId}/autonomy/history` | GET | Get assessment history | ✅ Any role |

#### Create Autonomy Assessment
```http
POST /api/v1/patients/{patientId}/autonomy
Authorization: Bearer <token>
Content-Type: application/json

{
  "hygieneLevel": "ASSISTED",
  "medicationLevel": "DEPENDENT",
  "mobilityLevel": "INDEPENDENT",
  "feedingLevel": "ASSISTED",
  "notes": "Patient needs reminders for medication but is otherwise independent"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "hygieneLevel": "ASSISTED",
  "medicationLevel": "DEPENDENT",
  "mobilityLevel": "INDEPENDENT",
  "feedingLevel": "ASSISTED",
  "overallScore": 6,
  "notes": "Patient needs reminders for medication but is otherwise independent",
  "assessedAt": "2026-02-13T10:30:00Z"
}
```

#### Get Latest Assessment
```http
GET /api/v1/patients/{patientId}/autonomy
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "hygieneLevel": "ASSISTED",
  "medicationLevel": "DEPENDENT",
  "mobilityLevel": "INDEPENDENT",
  "feedingLevel": "ASSISTED",
  "overallScore": 6,
  "notes": "Patient needs reminders for medication but is otherwise independent",
  "assessedAt": "2026-02-13T10:30:00Z"
}
```

#### Get Assessment History
```http
GET /api/v1/patients/{patientId}/autonomy/history
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440003",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "hygieneLevel": "ASSISTED",
    "medicationLevel": "DEPENDENT",
    "mobilityLevel": "INDEPENDENT",
    "feedingLevel": "ASSISTED",
    "overallScore": 6,
    "notes": "Patient needs reminders for medication but is otherwise independent",
    "assessedAt": "2026-02-13T10:30:00Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "hygieneLevel": "INDEPENDENT",
    "medicationLevel": "ASSISTED",
    "mobilityLevel": "INDEPENDENT",
    "feedingLevel": "INDEPENDENT",
    "overallScore": 9,
    "notes": "Early stage, minimal assistance needed",
    "assessedAt": "2026-01-15T09:00:00Z"
  }
]
```

#### Check Profile Existence (Admin)
```http
GET /api/v1/admin/profiles/{userId}/exists
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "exists": true,
  "userId": "keycloak-patient-id",
  "role": "PATIENT",
  "profileType": "PATIENT"
}
```

**Response when profile doesn't exist:**
```json
{
  "exists": false,
  "userId": "keycloak-user-id",
  "role": "PATIENT",
  "profileType": "PATIENT"
}
```

#### Update User Profile (Generic - Admin)
```http
PUT /api/v1/admin/profiles/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Updated Name",
  "phone": "+1234567890"
}
```

**Note:** The request body must match the user's role type (PatientUpdateRequest, DoctorUpdateRequest, or CaregiverUpdateRequest).

**Response (200 OK):** Returns the appropriate profile type based on user's role.

---

### User Admin APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/admin/users` | GET | Get all users with filters | ✅ ADMIN |
| `/admin/users/{userId}` | GET | Get user by ID | ✅ ADMIN |
| `/admin/users` | POST | Create new user with profile | ✅ ADMIN |
| `/admin/users/{userId}` | PUT | Update user | ✅ ADMIN |
| `/admin/users/{userId}` | DELETE | Delete user | ✅ ADMIN |
| `/admin/users/{userId}/reset-password` | POST | Reset user password | ✅ ADMIN |

#### Get All Users
```http
GET /api/v1/admin/users?search=john&role=PATIENT&status=ACTIVE&page=0&size=20
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by username/email |
| `role` | string | No | Filter by role (PATIENT, DOCTOR, CAREGIVER, ADMIN) |
| `status` | string | No | Filter by status (ACTIVE, INACTIVE, PENDING) |
| `page` | number | No | Page number (default: 0) |
| `size` | number | No | Page size (default: 20) |

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": "keycloak-user-id",
      "username": "john.doe",
      "email": "john@example.com",
      "role": "PATIENT",
      "status": "ACTIVE",
      "enabled": true,
      "emailVerified": true,
      "createdAt": "2026-01-15T08:00:00Z",
      "lastLogin": "2026-02-17T14:30:00Z"
    }
  ],
  "totalElements": 1,
  "totalPages": 1,
  "size": 20,
  "number": 0
}
```

#### Get User by ID
```http
GET /api/v1/admin/users/{userId}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "keycloak-user-id",
  "username": "john.doe",
  "email": "john@example.com",
  "role": "PATIENT",
  "status": "ACTIVE",
  "enabled": true,
  "emailVerified": true,
  "createdAt": "2026-01-15T08:00:00Z",
  "lastLogin": "2026-02-17T14:30:00Z"
}
```

#### Create User
```http
POST /api/v1/admin/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "john.doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "PATIENT",
  "enabled": true,
  "emailVerified": false,
  "dateOfBirth": "1950-05-15",
  "gender": "MALE",
  "preferredLanguage": "ENGLISH",
  "phone": "+1234567890",
  "emergencyContact": "Jane Doe: +0987654321",
  "address": "123 Main St, City"
}
```

**Create Doctor Example:**
```json
{
  "username": "dr.smith",
  "email": "dr.smith@hospital.com",
  "password": "SecurePass123!",
  "firstName": "Dr. Sarah",
  "lastName": "Smith",
  "role": "DOCTOR",
  "speciality": "Neurology",
  "licenseNumber": "MD-12345-NY",
  "phone": "+1234567890",
  "contact": "clinic@hospital.com",
  "isAvailable": true
}
```

**Create Caregiver Example:**
```json
{
  "username": "caregiver.mike",
  "email": "mike@care.com",
  "password": "SecurePass123!",
  "firstName": "Mike",
  "lastName": "Johnson",
  "role": "CAREGIVER",
  "phone": "+1234567890",
  "contact": "mike@care.com",
  "isAvailable": true,
  "isProfessional": true
}
```

**Response (201 Created):**
```json
{
  "id": "new-keycloak-user-id",
  "username": "john.doe",
  "email": "john@example.com",
  "role": "PATIENT",
  "status": "ACTIVE",
  "enabled": true,
  "emailVerified": false,
  "createdAt": "2026-02-17T14:30:00Z",
  "lastLogin": null
}
```

#### Update User
```http
PUT /api/v1/admin/users/{userId}
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "new.email@example.com",
  "firstName": "Johnny",
  "lastName": "Doe",
  "enabled": true,
  "role": "PATIENT",
  "phone": "+9876543210",
  "address": "New Address"
}
```

**Response (200 OK):** Returns updated UserResponse

#### Delete User
```http
DELETE /api/v1/admin/users/{userId}
Authorization: Bearer <token>
```

**Response (204 No Content)**

#### Reset Password
```http
POST /api/v1/admin/users/{userId}/reset-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "NewSecurePass123!",
  "temporary": false
}
```

**Response (200 OK)**

---

## Safety Alert Engine APIs

Base path: `/api` (behavior-logs and alerts proxied to port 8082)

### Behavior Log APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/behavior-logs/manual` | POST | Create manual behavior log | ✅ CAREGIVER |
| `/api/behavior-logs/auto` | POST | Create auto-detected event | ✅ System |
| `/api/behavior-logs/{id}` | GET | Get behavior log by ID | ✅ Any role |
| `/api/behavior-logs/patient/{patientId}` | GET | Get patient behavior logs | ✅ Any role |
| `/api/behavior-logs/pending` | GET | Get pending validations | ✅ CAREGIVER |
| `/api/behavior-logs/{id}/validate` | PUT | Validate auto-detected event | ✅ CAREGIVER |
| `/api/behavior-logs/{id}/evaluate` | POST | Evaluate behavior for risks | ✅ ADMIN |
| `/api/behavior-logs/{id}` | PUT | Update behavior log (edit) | ✅ CAREGIVER |
| `/api/behavior-logs/{id}` | DELETE | Delete behavior log | ✅ CAREGIVER |

#### Create Auto-Detected Event
```http
POST /api/safety/behavior-logs/auto
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FALL",
  "severity": 4,
  "timestamp": "2026-02-17T14:30:00Z",
  "location": "Kitchen",
  "description": "AI detected fall motion pattern",
  "deviceId": "camera-001",
  "confidenceScore": 0.92,
  "imageUrls": ["https://res.cloudinary.com/.../detection.jpg"]
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440011",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FALL",
  "severity": "FOUR",
  "timestamp": "2026-02-17T14:30:00Z",
  "location": "Kitchen",
  "source": "AUTO",
  "validationStatus": "PENDING",
  "deviceId": "camera-001",
  "confidenceScore": 0.92,
  "processedForAlert": false,
  "imageUrls": ["https://res.cloudinary.com/.../detection.jpg"]
}
```

#### Get Behavior Log by ID
```http
GET /api/safety/behavior-logs/{id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FALL",
  "severity": "FOUR",
  "timestamp": "2026-02-17T14:30:00Z",
  "location": "Living Room",
  "source": "MANUAL",
  "validationStatus": "CONFIRMED",
  "validatedBy": "caregiver-id",
  "validationNotes": "Confirmed fall, patient bruised knee",
  "validatedAt": "2026-02-17T14:35:00Z",
  "description": "Patient fell while getting up from sofa",
  "triggers": "Attempted to stand without walker",
  "witnesses": "Caregiver present",
  "reportedBy": "caregiver@example.com",
  "processedForAlert": true,
  "imageUrls": ["https://res.cloudinary.com/.../fall.jpg"]
}
```

#### Evaluate Behavior Log (Testing)
```http
POST /api/safety/behavior-logs/{id}/evaluate
Authorization: Bearer <token>
```

**Response (200 OK)** - Triggers risk detection evaluation for the behavior log.

#### Validate Auto-Detected Behavior
```http
PUT /api/safety/behavior-logs/{id}/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "validationStatus": "CONFIRMED",
  "validatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "validationNotes": "Confirmed by caregiver - patient was indeed wandering in the hallway"
}
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `validationStatus` | string | Yes | `CONFIRMED` or `FALSE_ALARM` |
| `validatedBy` | string | Yes | UUID of caregiver performing validation |
| `validationNotes` | string | No | Notes about the validation decision |

**Validation Status Values:**
- `CONFIRMED` - Behavior was correctly detected
- `FALSE_ALARM` - Behavior was incorrectly detected (false positive)

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440011",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "WANDERING",
  "severity": "THREE",
  "source": "AUTO",
  "validationStatus": "CONFIRMED",
  "validatedBy": "550e8400-e29b-41d4-a716-446655440000",
  "validationNotes": "Confirmed by caregiver - patient was indeed wandering",
  "validatedAt": "2026-02-17T15:00:00Z"
}
```

**Notes:**
- Only behaviors with `source: AUTO` and `validationStatus: PENDING` can be validated
- Once validated, status cannot be changed (CONFIRMED or FALSE_ALARM is final)
- Validation timestamp is automatically set by backend
- Alerts are created for both confirmed and false alarm validations

#### Create Manual Behavior Log
```http
POST /api/safety/behavior-logs/manual
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FALL",
  "severity": 4,
  "location": "Living Room",
  "description": "Patient fell while getting up from sofa",
  "triggers": "Attempted to stand without walker",
  "witnesses": "Caregiver present",
  "reportedBy": "caregiver@example.com",
  "imageUrls": ["https://res.cloudinary.com/.../fall.jpg"]
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FALL",
  "severity": 4,
  "timestamp": "2026-02-17T14:30:00Z",
  "location": "Living Room",
  "source": "MANUAL",
  "validationStatus": "CONFIRMED",
  "reportedBy": "caregiver@example.com",
  "processedForAlert": true,
  "imageUrls": ["https://res.cloudinary.com/.../fall.jpg"]
}
```

#### Update Behavior Log
```http
PUT /api/safety/behavior-logs/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "FALL",
  "severity": 3,
  "location": "Updated Location",
  "description": "Updated description",
  "triggers": "Updated triggers",
  "witnesses": "Updated witnesses",
  "imageUrls": ["https://..."]
}
```

**Notes:**
- Only manual behavior logs (`source: MANUAL`) can be updated
- Auto-detected events cannot be edited (use validate endpoint instead)
- All fields are optional - only provided fields will be updated
- Patient cannot be changed when updating (use patientId from original log)

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "FALL",
  "severity": "THREE",
  "timestamp": "2026-02-17T14:30:00Z",
  "location": "Updated Location",
  "source": "MANUAL",
  "validationStatus": "CONFIRMED",
  "description": "Updated description",
  "imageUrls": ["https://..."]
}
```

#### Delete Behavior Log
```http
DELETE /api/safety/behavior-logs/{id}
Authorization: Bearer <token>
```

**Notes:**
- Only manual behavior logs (`source: MANUAL`) can be deleted
- Auto-detected events cannot be deleted
- This action is permanent and cannot be undone
- Confirmation dialog recommended in frontend

**Response (204 No Content)**

### Alert APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/alerts` | GET | Get all alerts with filters | ✅ Any role |
| `/api/alerts` | POST | Create alert (testing) | ✅ ADMIN |
| `/api/alerts/{id}` | GET | Get alert by ID | ✅ Any role |
| `/api/alerts/active` | GET | Get active alerts | ✅ Any role |
| `/api/alerts/overdue` | GET | Get overdue alerts | ✅ Any role |
| `/api/alerts/patient/{patientId}` | GET | Get patient alerts | ✅ Any role |
| `/api/alerts/{id}/acknowledge` | POST | Acknowledge alert | ✅ CAREGIVER |
| `/api/alerts/{id}/resolve` | POST | Resolve alert | ✅ CAREGIVER |
| `/api/alerts/{id}/escalate` | POST | Escalate alert | ✅ CAREGIVER/DOCTOR |
| `/api/alerts/{id}/history` | GET | Get alert history | ✅ Any role |

#### Get All Alerts
```http
GET /api/safety/alerts?status=ACTIVE&severity=CRITICAL
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by status (ACTIVE, RESOLVED) |
| `severity` | string | No | Filter by severity (LOW, MEDIUM, HIGH, CRITICAL) |

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "ruleCode": "FALL_HIGH_SEVERITY",
    "severity": "CRITICAL",
    "status": "ACTIVE",
    "triggeredAt": "2026-02-17T14:30:00Z",
    "escalationDeadlineAt": "2026-02-17T14:45:00Z",
    "currentLevel": "L1_CAREGIVER",
    "isEscalationOverdue": false,
    "escalationMinutesRemaining": 12
  }
]
```

#### Get Alert by ID
```http
GET /api/safety/alerts/{id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "ruleCode": "FALL_HIGH_SEVERITY",
  "severity": "CRITICAL",
  "status": "ACTIVE",
  "sourceId": "behavior-log-id",
  "triggeredAt": "2026-02-17T14:30:00Z",
  "escalationDeadlineAt": "2026-02-17T14:45:00Z",
  "resolvedAt": null,
  "resolutionType": null,
  "resolutionNotes": null,
  "resolvedBy": null,
  "isFalsePositive": false,
  "currentLevel": "L1_CAREGIVER",
  "createdAt": "2026-02-17T14:30:00Z",
  "isEscalationOverdue": false,
  "escalationMinutesRemaining": 12
}
```

#### Create Alert (Testing)
```http
POST /api/safety/alerts
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "ruleCode": "FALL_HIGH_SEVERITY",
  "severity": "CRITICAL",
  "sourceId": "behavior-log-id"
}
```

**Response (201 Created):** Returns created AlertResponse

#### Get Active Alerts
```http
GET /api/safety/alerts/active
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "ruleCode": "FALL_HIGH_SEVERITY",
    "severity": "CRITICAL",
    "status": "ACTIVE",
    "triggeredAt": "2026-02-17T14:30:00Z",
    "escalationDeadlineAt": "2026-02-17T14:45:00Z",
    "currentLevel": "L1_CAREGIVER",
    "isEscalationOverdue": false,
    "escalationMinutesRemaining": 12
  }
]
```

#### Acknowledge Alert
```http
POST /api/safety/alerts/{id}/acknowledge
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "caregiver-keycloak-id",
  "notes": "Checked on patient, no injuries found"
}
```

#### Resolve Alert
```http
POST /api/safety/alerts/{id}/resolve
Authorization: Bearer <token>
Content-Type: application/json

{
  "resolutionType": "CHECKED_OK",
  "resolutionNotes": "Patient is fine, no medical attention needed",
  "isFalsePositive": false,
  "resolvedBy": "caregiver-keycloak-id"
}
```

### TypeScript Interfaces (Frontend)

```typescript
// Enums
export type BehaviorType = 
  | 'FALL' | 'WANDERING' | 'AGITATION' | 'SLEEP_DISORDER' 
  | 'HALLUCINATION' | 'CONFUSION' | 'AGGRESSION' 
  | 'MEDICATION_REFUSAL' | 'OTHER';

export type BehaviorSource = 'MANUAL' | 'AUTO';
export type BehaviorValidationStatus = 'PENDING' | 'CONFIRMED' | 'FALSE_ALARM';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'RESOLVED';

export type ResolutionActionType = 
  | 'CHECKED_OK' | 'APPOINTMENT_SCHEDULED' | 'EMERGENCY_CONTACTED' 
  | 'MEDICATION_ADJUSTED' | 'ENVIRONMENT_MODIFIED' | 'INCIDENT_REPORT_CREATED';

export type AlertActionType = 
  | 'NOTIFIED' | 'ESCALATED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';

// Request DTOs
export interface CreateManualBehaviorLogRequest {
  patientId: string;
  type: BehaviorType;
  severity: number; // 1-5 (sent as number, backend converts to enum)
  timestamp?: string;
  location?: string;
  description?: string;
  triggers?: string;
  witnesses?: string;
  reportedBy?: string;
  imageUrls?: string[];
}

export interface ValidateBehaviorRequest {
  validationStatus: BehaviorValidationStatus; // 'CONFIRMED' or 'FALSE_ALARM'
  validatedBy: string; // Required: ID of caregiver validating the behavior
  validationNotes?: string; // Optional: Notes about the validation decision
}

export interface AcknowledgeAlertRequest {
  userId: string;
  notes?: string;
}

export interface ResolveAlertRequest {
  resolutionType: ResolutionActionType;
  resolutionNotes?: string;
  isFalsePositive: boolean;
  resolvedBy: string;
}

// Response DTOs
export interface BehaviorLogResponse {
  id: string;
  patientId: string;
  type: BehaviorType;
  severity: BehaviorSeverity; // ONE, TWO, THREE, FOUR, FIVE
  timestamp: string;
  location?: string;
  source: BehaviorSource;
  validationStatus: BehaviorValidationStatus;
  validatedBy?: string;
  validationNotes?: string;
  validatedAt?: string;
  description?: string;
  triggers?: string;
  witnesses?: string;
  reportedBy?: string;
  deviceId?: string;
  confidenceScore?: number;
  processedForAlert: boolean;
  imageUrls: string[];
}

export interface AlertResponse {
  id: string;
  patientId: string;
  ruleCode: string;
  severity: AlertSeverity;
  status: AlertStatus;
  sourceId?: string;
  triggeredAt: string;
  escalationDeadlineAt: string;
  resolvedAt?: string;
  resolutionType?: ResolutionActionType;
  resolutionNotes?: string;
  resolvedBy?: string;
  isFalsePositive: boolean;
  currentLevel: string;
  createdAt: string;
  isEscalationOverdue: boolean;
  escalationMinutesRemaining: number;
}

export interface AlertHistoryResponse {
  id: string;
  alertId: string;
  actionType: AlertActionType;
  performedAt: string;
  performedBy?: string;
  notes?: string;
  isSystemAction: boolean;
}
```

---

## Care Team Service APIs

Base path: `/api/v1/care-team` (proxied to care-team-service port 8008)

### Caregiver Assignment APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/caregivers/generate-invite` | POST | Generate invite token for caregiver | ✅ ADMIN |
| `/invitations/{token}/validate` | GET | Validate invite token before accepting | ✅ Any role |
| `/invitations/{token}/accept` | POST | Accept invite and link caregiver to patient | ✅ CAREGIVER |
| `/patients/{patientId}/caregivers` | GET | List all caregivers assigned to a patient | ✅ Any role |
| `/caregivers/{caregiverId}/assignments` | GET | Get all patient assignments for a caregiver | ✅ CAREGIVER |
| `/caregivers/assignments/{id}/role` | PUT | Change caregiver's role in assignment | ✅ ADMIN |
| `/caregivers/assignments/{id}` | DELETE | Revoke caregiver's access to patient | ✅ ADMIN |
| `/caregivers/assignments/{id}/availability` | PUT | Mark caregiver temporarily unavailable | ✅ CAREGIVER |

#### Get Caregiver's Assignments (My Patients)
```http
GET /api/v1/care-team/caregivers/{caregiverId}/assignments
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "caregiverId": "caregiver-keycloak-id",
    "patientId": "patient-keycloak-id",
    "role": "PRIMARY",
    "status": "ACTIVE",
    "assignedAt": "2026-02-28T10:00:00Z",
    "patientFirstName": "John",
    "patientLastName": "Doe"
  }
]
```

**Note:** Caregivers should use this endpoint to get their assigned patients, then fetch patient details from Identity Service.

#### Generate Caregiver Invite
```http
POST /api/v1/care-team/caregivers/generate-invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": "patient-keycloak-id",
  "caregiverId": "caregiver-keycloak-id",
  "role": "FAMILY"
}
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "patientId": "patient-keycloak-id",
  "role": "FAMILY",
  "status": "PENDING",
  "inviteToken": "abc123xyz",
  "inviteExpiresAt": "2026-03-07T10:00:00Z"
}
```

### Doctor Assignment APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/doctors/{doctorId}/patients/create` | POST | Assign doctor to patient | ✅ ADMIN/DOCTOR |
| `/doctors/{doctorId}/patients` | GET | List all patients assigned to doctor | ✅ DOCTOR |
| `/patients/{patientId}/doctor` | GET | Get active doctor for a patient | ✅ Any role |
| `/doctor-assignments/{id}/deactivate` | PUT | Deactivate doctor-patient assignment | ✅ ADMIN |

### Checklist Item APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/checklists/items` | POST | Create checklist item | ✅ DOCTOR |
| `/checklists/items/{id}` | GET | Get checklist item by ID | ✅ Any role |
| `/checklists/doctor/{doctorId}` | GET | Get all items created by doctor | ✅ DOCTOR |
| `/checklists/patient/{patientId}/date/{date}` | GET | Get patient's checklist for date | ✅ Any role |
| `/checklists/items/{id}/assign` | PUT | Assign item to caregiver | ✅ DOCTOR |
| `/checklists/items/{id}/complete` | PUT | Mark item as completed | ✅ CAREGIVER |
| `/checklists/items/{id}` | DELETE | Delete checklist item | ✅ DOCTOR |

### Caregiver Handover APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/caregivers/handover` | POST | Create handover note | ✅ CAREGIVER |
| `/caregivers/handover/{id}/acknowledge` | PUT | Acknowledge handover note | ✅ CAREGIVER |
| `/caregivers/patients/{patientId}/handovers` | GET | Get handover notes for patient | ✅ Any role |

### TypeScript Interfaces (Care Team)

```typescript
// Enums
export enum CaregiverRole {
  PRIMARY = 'PRIMARY',
  FAMILY = 'FAMILY',
  EMERGENCY = 'EMERGENCY'
}

export enum AssignmentStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED'
}

export enum DoctorAssignmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export enum ChecklistPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export enum ChecklistStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  COMPLETED = 'COMPLETED'
}

// Request DTOs
export interface GenerateCaregiverInviteRequest {
  patientId: string;
  caregiverId: string;
  role: CaregiverRole;
}

export interface AcceptCaregiverInviteRequest {
  token: string;
}

export interface ChangeCaregiverRoleRequest {
  role: CaregiverRole;
}

export interface CreateChecklistItemRequest {
  doctorId: string;
  patientId: string;
  date: string; // YYYY-MM-DD
  description: string;
  priority: ChecklistPriority;
  category: 'MEDICATION' | 'INCIDENT' | 'COGNITIVE_TEST' | 'GENERAL';
}

// Response DTOs
export interface CaregiverAssignment {
  id: string;
  caregiverId: string;
  patientId: string;
  role: CaregiverRole;
  status: AssignmentStatus;
  assignedAt: string;
  patientFirstName?: string;
  patientLastName?: string;
}

export interface DoctorAssignment {
  id: string;
  doctorId: string;
  patientId: string;
  status: DoctorAssignmentStatus;
  assignedAt: string;
}

export interface ChecklistItem {
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  description: string;
  priority: ChecklistPriority;
  status: ChecklistStatus;
  assignedCaregiverId?: string;
  completedBy?: string;
  completedAt?: string;
}
```

---

## Data Models

### Enums

```typescript
// GenderEnum
enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

// LanguageEnum
enum LanguageEnum {
  ARABIC = 'ARABIC',
  FRENCH = 'FRENCH',
  ENGLISH = 'ENGLISH'
}

// AutonomyLevel
enum AutonomyLevel {
  INDEPENDENT = 'INDEPENDENT',
  ASSISTED = 'ASSISTED',
  DEPENDENT = 'DEPENDENT'
}
```

### TypeScript Interfaces (Frontend)

```typescript
// Patient Profile
interface PatientProfile {
  id: string;
  keycloakId: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  gender: 'MALE' | 'FEMALE';
  preferredLanguage: 'ARABIC' | 'FRENCH' | 'ENGLISH';
  culturalContext?: string;
  photoUrl?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  isActive: boolean;
  totalPoints?: number;
  currentStreak?: number;
  lastPlayedDate?: string;
  assistedModeActive?: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

// Doctor Profile
interface DoctorProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  speciality: string;
  licenseNumber: string;
  phone: string;
  contact?: string;
  address?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// Caregiver Profile
interface CaregiverProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  phone: string;
  address?: string;
  contact?: string;
  isAvailable: boolean;
  isProfessional: boolean;
  createdAt: string;
  updatedAt: string;
}

// Autonomy Assessment
interface AutonomyAssessment {
  id: string;
  patientId: string;
  hygieneLevel: 'INDEPENDENT' | 'ASSISTED' | 'DEPENDENT';
  medicationLevel: 'INDEPENDENT' | 'ASSISTED' | 'DEPENDENT';
  mobilityLevel: 'INDEPENDENT' | 'ASSISTED' | 'DEPENDENT';
  feedingLevel: 'INDEPENDENT' | 'ASSISTED' | 'DEPENDENT';
  overallScore: number; // 4-12 calculated
  notes?: string;
  assessedAt: string;
}

// Keycloak Token Response
interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

// User Response (Keycloak User)
interface UserResponse {
  id: string;  // Keycloak user ID
  username: string;
  email: string;
  role: 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  enabled: boolean;
  emailVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

// Paginated Response
interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// User Create Request
interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';
  enabled?: boolean;
  emailVerified?: boolean;
  // Patient-specific
  dateOfBirth?: string;
  gender?: string;
  preferredLanguage?: string;
  photoUrl?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  // Doctor-specific
  speciality?: string;
  licenseNumber?: string;
  contact?: string;
  // Caregiver-specific
  isProfessional?: boolean;
}

// User Update Request
interface UserUpdateRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  role?: 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | 'ADMIN';
  phone?: string;
  address?: string;
  speciality?: string;
  licenseNumber?: string;
  isAvailable?: boolean;
  isProfessional?: boolean;
}
```

---

## Frontend Integration Guide

### 1. API Service Setup

Create `api.service.ts`:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api/v1'; // Proxied to gateway

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Patients
  getPatient(keycloakId: string): Observable<PatientProfile> {
    return this.http.get<PatientProfile>(
      `${this.baseUrl}/patients/${keycloakId}`,
      { headers: this.getHeaders() }
    );
  }

  createPatient(data: PatientCreateRequest): Observable<PatientProfile> {
    return this.http.post<PatientProfile>(
      `${this.baseUrl}/patients`,
      data,
      { headers: this.getHeaders() }
    );
  }

  updatePatient(id: string, data: Partial<PatientProfile>): Observable<PatientProfile> {
    return this.http.put<PatientProfile>(
      `${this.baseUrl}/patients/${id}`,
      data,
      { headers: this.getHeaders() }
    );
  }

  // Autonomy Assessments
  getLatestAssessment(patientId: string): Observable<AutonomyAssessment> {
    return this.http.get<AutonomyAssessment>(
      `${this.baseUrl}/patients/${patientId}/autonomy`,
      { headers: this.getHeaders() }
    );
  }

  getAssessmentHistory(patientId: string): Observable<AutonomyAssessment[]> {
    return this.http.get<AutonomyAssessment[]>(
      `${this.baseUrl}/patients/${patientId}/autonomy/history`,
      { headers: this.getHeaders() }
    );
  }
}
```

### 2. Authentication Service

Update `auth.service.ts` to use Keycloak:

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private keycloakUrl = '/realms/alzcare/protocol/openid-connect/token';
  private clientId = 'alzcare-webapp';
  
  private currentUser = new BehaviorSubject<any>(null);
  
  login(username: string, password: string): Observable<TokenResponse> {
    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', this.clientId)
      .set('username', username)
      .set('password', password);

    return this.http.post<TokenResponse>(this.keycloakUrl, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      tap(response => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        // Decode JWT to get user info
        const payload = JSON.parse(atob(response.access_token.split('.')[1]));
        this.currentUser.next(payload);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    this.currentUser.next(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }
}
```

### 3. Proxy Configuration

Create `proxy.conf.json`:

```json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  },
  "/realms": {
    "target": "http://localhost:8090",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Update `angular.json`:

```json
"serve": {
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

---

## Testing with curl

### 1. Get Access Token
```bash
curl -X POST http://localhost:8090/realms/alzcare/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=alzcare-webapp" \
  -d "username=admin@example.com" \
  -d "password=Admin123!"
# For other users use: -d "password=Password123!"
```

### 2. Create Patient
```bash
curl -X POST http://localhost:8080/api/v1/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "keycloakId": "test-keycloak-id",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1950-05-15",
    "gender": "MALE",
    "preferredLanguage": "ENGLISH"
  }'
```

### 3. Get Patient
```bash
curl http://localhost:8080/api/v1/patients/test-keycloak-id \
  -H "Authorization: Bearer $TOKEN"
```

---

## Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Request successful |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Server Error |

---

## Notification Service APIs

Base path: `/api/v1/notifications` (proxied to notification-service port 8004)

### Notification APIs

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/notifications` | GET | Get all notifications with filters | ✅ ADMIN |
| `/notifications/{id}` | GET | Get notification by ID | ✅ Any role |
| `/notifications` | POST | Send manual notification | ✅ ADMIN |
| `/notifications/{id}/retry` | POST | Retry failed notification | ✅ ADMIN |
| `/notifications/user/{userId}` | GET | Get user's notifications with filters | ✅ Any role |
| `/notifications/user/{userId}/unread/count` | GET | Get unread notification count | ✅ Any role |
| `/notifications/user/{userId}/mark-all-read` | PUT | Mark all notifications as read | ✅ Any role |
| `/notifications/{id}/read` | PUT | Mark single notification as read | ✅ Any role |
| `/notifications/{id}` | DELETE | Delete notification | ✅ Any role |

#### Get All Notifications (Admin)
```http
GET /api/v1/notifications?userId={userId}&status=SENT&type=ALERT&page=0&size=20
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | string | No | Filter by recipient user ID |
| `status` | string | No | Filter by status (PENDING, SENT, READ, FAILED) |
| `type` | string | No | Filter by type (ALERT, REMINDER, SYSTEM, MESSAGE, APPOINTMENT, BEHAVIOR) |
| `page` | number | No | Page number (default: 0) |
| `size` | number | No | Page size (default: 20) |

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "recipientId": "keycloak-user-id",
      "type": "ALERT",
      "priority": "HIGH",
      "status": "SENT",
      "title": "Fall Detected",
      "message": "A fall was detected for patient John Doe",
      "channels": ["IN_APP", "EMAIL"],
      "createdAt": "2026-02-19T10:30:00Z",
      "sentAt": "2026-02-19T10:30:05Z",
      "readAt": null,
      "retryCount": 0
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true
}
```

#### Get Notification by ID
```http
GET /api/v1/notifications/{id}
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "recipientId": "keycloak-user-id",
  "type": "ALERT",
  "priority": "HIGH",
  "status": "READ",
  "title": "Fall Detected",
  "message": "A fall was detected for patient John Doe",
  "channels": ["IN_APP", "EMAIL"],
  "createdAt": "2026-02-19T10:30:00Z",
  "sentAt": "2026-02-19T10:30:05Z",
  "readAt": "2026-02-19T10:35:00Z",
  "retryCount": 0
}
```

#### Send Manual Notification
```http
POST /api/v1/notifications
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientId": "keycloak-user-id",
  "type": "SYSTEM",
  "priority": "HIGH",
  "title": "System Maintenance",
  "message": "The system will undergo maintenance tonight at 2 AM.",
  "channels": ["IN_APP", "EMAIL"]
}
```

**Response (201 Created):** Returns created NotificationResponse

#### Retry Failed Notification
```http
POST /api/v1/notifications/{id}/retry
Authorization: Bearer <token>
```

**Response (200 OK):** Returns updated NotificationResponse

#### Get Unread Count
```http
GET /api/v1/notifications/user/{userId}/unread/count
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "userId": "keycloak-user-id",
  "unreadCount": 5,
  "totalCount": 15
}
```

#### Mark All Notifications as Read
```http
PUT /api/v1/notifications/user/{userId}/mark-all-read
Authorization: Bearer <token>
```

**Response (200 OK)**

#### Get User Notifications
```http
GET /api/v1/notifications/user/{userId}?status=UNREAD&page=0&size=20
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "userId": "keycloak-user-id",
      "type": "ALERT",
      "priority": "HIGH",
      "status": "UNREAD",
      "title": "Fall Detected",
      "message": "A fall was detected for patient John Doe",
      "icon": "🚨",
      "actionUrl": "/caregiver/behaviors/patient-id",
      "actionLabel": "View Details",
      "createdAt": "2026-02-19T10:30:00Z",
      "readAt": null
    }
  ],
  "totalElements": 15,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true
}
```

#### Get Unread Count
```http
GET /api/v1/notifications/user/{userId}/unread-count
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "count": 5,
  "criticalCount": 1,
  "highPriorityCount": 2
}
```

### TypeScript Interfaces

```typescript
export type NotificationType = 'ALERT' | 'REMINDER' | 'SYSTEM' | 'MESSAGE' | 'APPOINTMENT' | 'BEHAVIOR';
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type NotificationStatus = 'READ' | 'UNREAD';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
  readAt?: string;
}

export interface PagedNotificationResponse {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
```

### Notification Schedule APIs

Base path: `/api/v1/schedules`

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/schedules` | GET | List all schedules | ✅ ADMIN |
| `/schedules/{id}` | GET | Get schedule by ID | ✅ ADMIN |
| `/schedules` | POST | Create schedule | ✅ ADMIN |
| `/schedules/{id}` | PUT | Update schedule | ✅ ADMIN |
| `/schedules/{id}` | DELETE | Delete schedule | ✅ ADMIN |
| `/schedules/{id}/toggle` | PATCH | Toggle schedule active status | ✅ ADMIN |
| `/schedules/{id}/trigger` | POST | Manually trigger schedule | ✅ ADMIN |

#### List All Schedules
```http
GET /api/v1/schedules?targetRole=PATIENT&active=true&page=0&size=20
Authorization: Bearer <token>
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targetRole` | string | No | Filter by target role (PATIENT, CAREGIVER, DOCTOR, ALL) |
| `active` | boolean | No | Filter by active status |
| `page` | number | No | Page number (default: 0) |
| `size` | number | No | Page size (default: 20) |

**Response (200 OK):**
```json
{
  "content": [
    {
      "id": "schedule-id-001",
      "name": "Daily Medication Reminder",
      "description": "Reminds patients to take their morning medication",
      "targetRole": "PATIENT",
      "targetUserIds": null,
      "titleTemplate": "Medication Reminder",
      "messageTemplate": "It's time to take your morning medication. Don't forget!",
      "type": "REMINDER",
      "priority": "HIGH",
      "channels": ["IN_APP", "PUSH"],
      "scheduleType": "CRON",
      "cronExpression": "0 8 * * *",
      "intervalMinutes": null,
      "startDate": "2026-01-01T00:00:00Z",
      "endDate": null,
      "timezone": "America/New_York",
      "active": true,
      "createdBy": "admin-user-id",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-01T00:00:00Z",
      "lastExecutedAt": "2026-02-17T08:00:00Z",
      "executionCount": 48,
      "nextExecutionTime": "2026-02-18T08:00:00Z"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "size": 20,
  "number": 0,
  "first": true,
  "last": true
}
```

#### Get Schedule by ID
```http
GET /api/v1/schedules/{id}
Authorization: Bearer <token>
```

**Response (200 OK):** Returns ScheduleResponse (same structure as list items)

#### Create Schedule
```http
POST /api/v1/schedules
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Weekly Health Check",
  "description": "Weekly reminder for health check-in",
  "targetRole": "PATIENT",
  "targetUserIds": null,
  "titleTemplate": "Weekly Health Check",
  "messageTemplate": "Time for your weekly health check-in. Please update your symptoms.",
  "type": "REMINDER",
  "priority": "MEDIUM",
  "channels": ["IN_APP", "EMAIL"],
  "scheduleType": "CRON",
  "cronExpression": "0 9 * * 1",
  "intervalMinutes": null,
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": null,
  "timezone": "America/New_York",
  "active": true
}
```

**Interval-based Schedule Example:**
```json
{
  "name": "Hydration Reminder",
  "description": "Reminds patients to drink water every 2 hours",
  "targetRole": "PATIENT",
  "titleTemplate": "Stay Hydrated! 💧",
  "messageTemplate": "It's been 2 hours. Time to drink a glass of water!",
  "type": "REMINDER",
  "priority": "LOW",
  "channels": ["IN_APP"],
  "scheduleType": "INTERVAL",
  "intervalMinutes": 120,
  "startDate": "2026-03-01T08:00:00Z",
  "endDate": "2026-03-01T20:00:00Z",
  "timezone": "America/New_York",
  "active": true
}
```

**One-time Schedule Example:**
```json
{
  "name": "Doctor Appointment Reminder",
  "description": "One-time reminder for doctor appointment",
  "targetRole": "PATIENT",
  "targetUserIds": ["specific-patient-id"],
  "titleTemplate": "Upcoming Appointment",
  "messageTemplate": "You have a doctor appointment tomorrow at 10 AM.",
  "type": "APPOINTMENT",
  "priority": "HIGH",
  "channels": ["IN_APP", "EMAIL", "SMS"],
  "scheduleType": "ONE_TIME",
  "startDate": "2026-03-10T18:00:00Z",
  "timezone": "America/New_York",
  "active": true
}
```

**Response (201 Created):** Returns created ScheduleResponse

#### Update Schedule
```http
PUT /api/v1/schedules/{id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Schedule Name",
  "description": "Updated description",
  "targetRole": "PATIENT",
  "targetUserIds": null,
  "titleTemplate": "Updated Title",
  "messageTemplate": "Updated message content",
  "type": "REMINDER",
  "priority": "HIGH",
  "channels": ["IN_APP", "EMAIL"],
  "scheduleType": "CRON",
  "cronExpression": "0 10 * * *",
  "intervalMinutes": null,
  "startDate": "2026-03-01T00:00:00Z",
  "endDate": null,
  "timezone": "America/New_York",
  "active": true
}
```

**Response (200 OK):** Returns updated ScheduleResponse

#### Delete Schedule
```http
DELETE /api/v1/schedules/{id}
Authorization: Bearer <token>
```

**Response (204 No Content)**

#### Toggle Schedule Status
```http
PATCH /api/v1/schedules/{id}/toggle
Authorization: Bearer <token>
```

**Response (200 OK):** Returns updated ScheduleResponse with toggled `active` status

#### Trigger Schedule Manually
```http
POST /api/v1/schedules/{id}/trigger
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Schedule triggered successfully",
  "scheduleId": "schedule-id-001",
  "status": "executing"
}
```

**Error Response (400 Bad Request) - When schedule is inactive:**
```json
{
  "error": "Cannot trigger inactive schedule",
  "scheduleId": "schedule-id-001"
}
```

### TypeScript Interfaces for Schedules

```typescript
// Enums
export type ScheduleType = 'CRON' | 'INTERVAL' | 'ONE_TIME';
export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'PUSH';

// Request DTOs
export interface CreateScheduleRequest {
  name: string;
  description?: string;
  targetRole: string;
  targetUserIds?: string[];
  titleTemplate: string;
  messageTemplate: string;
  type: NotificationType;
  priority?: NotificationPriority;
  channels: NotificationChannel[];
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalMinutes?: number;
  startDate: string; // ISO 8601
  endDate?: string;
  timezone?: string;
  active?: boolean;
}

export interface UpdateScheduleRequest {
  name: string;
  description?: string;
  targetRole: string;
  targetUserIds?: string[];
  titleTemplate: string;
  messageTemplate: string;
  type: NotificationType;
  priority?: NotificationPriority;
  channels: NotificationChannel[];
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalMinutes?: number;
  startDate: string;
  endDate?: string;
  timezone?: string;
  active: boolean;
}

// Response DTOs
export interface ScheduleResponse {
  id: string;
  name: string;
  description?: string;
  targetRole: string;
  targetUserIds?: string[];
  titleTemplate: string;
  messageTemplate: string;
  type: NotificationType;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalMinutes?: number;
  startDate: string;
  endDate?: string;
  timezone?: string;
  active: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  lastExecutedAt?: string;
  executionCount: number;
  nextExecutionTime?: string;
}

export interface PagedScheduleResponse {
  content: ScheduleResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
```

---

## Cognitive Memory - Health Records

Base path: `/api/v1/cognitive/health-records`

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| POST | `/api/v1/cognitive/health-records` | Create health record (DAILY_CHECKIN for patient, ASSESSMENT for doctor/admin) | PATIENT/DOCTOR/ADMIN |
| GET | `/api/v1/cognitive/health-records` | List health records (filters: `patientId`, `doctorUserId`, `recordType`) | PATIENT/CAREGIVER/DOCTOR/ADMIN |
| GET | `/api/v1/cognitive/health-records/{id}` | Get record by ID | PATIENT/CAREGIVER/DOCTOR/ADMIN |
| PUT | `/api/v1/cognitive/health-records/{id}` | Update assessment record | DOCTOR/ADMIN |
| DELETE | `/api/v1/cognitive/health-records/{id}` | Delete assessment record | DOCTOR/ADMIN |
| POST | `/api/v1/cognitive/health-records/{id}/submit` | Submit assessment responses | PATIENT/ADMIN |

### HealthRecord Fields (Key)
```
recordType: 'ASSESSMENT' | 'DAILY_CHECKIN' | 'PROGRESS'
assessmentType?: string (default MMSE for assessments)
frequencyMonths?: number
checkInFrequencyHours?: number
nextDueDate?: string (YYYY-MM-DD)
responses?: Record<string, unknown>
```

---

## Identity Service - Doctor Patients

Base path: `/api/v1/doctors`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/doctors/user/{userId}/patients` | Get patients assigned to doctor (optional `isActive`) |
| POST | `/api/v1/doctors/user/{doctorUserId}/patients/{patientUserId}` | Assign patient to doctor |
| DELETE | `/api/v1/doctors/user/{doctorUserId}/patients/{patientUserId}` | Unassign patient from doctor |

---

## Event Ingestion APIs

Base path: `/api` (proxied to event-ingestion service on port 8002)

### Camera Device Management

| Endpoint | Method | Description | Access |
|----------|--------|-------------|--------|
| `/api/cameras` | POST | Pair new camera to patient | ✅ DOCTOR, ADMIN |
| `/api/cameras/patient/{patientId}` | GET | Get cameras for patient | ✅ Any role |
| `/api/cameras/{id}` | GET | Get camera details | ✅ Any role |
| `/api/cameras/{id}/status` | PUT | Update camera status | ✅ DOCTOR, ADMIN |
| `/api/cameras/{id}` | DELETE | Unpair camera | ✅ DOCTOR, ADMIN |

**Camera Request Body:**
```json
{
  "patientId": "2f61732e-00bd-4980-8558-d790bc003e7a",
  "macAddress": "AA:BB:CC:DD:EE:01",
  "zone": "BEDROOM",
  "pairedBy": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Camera Response:**
```json
{
  "id": "25b73551-78a6-47b2-8e07-2f22a7ba96d3",
  "patientId": "2f61732e-00bd-4980-8558-d790bc003e7a",
  "macAddress": "AA:BB:CC:DD:EE:01",
  "zone": "BEDROOM",
  "status": "ACTIVE",
  "pairedAt": "2026-03-03T02:54:28.876878Z"
}
```

**Camera Zones:** `BEDROOM`, `HALLWAY`, `BATHROOM`, `FRONT_DOOR`, `KITCHEN`, `LIVING_ROOM`

**Camera Status:** `ACTIVE`, `PAUSED`, `OFFLINE`

---

## Service Status

| Service | Port | Base Path | Status |
|---------|------|-----------|--------|
| Event Ingestion | 8002 | `/api` | ✅ Implemented (Cameras, Events, Patterns) |
| Safety Alert Engine | 8003 | `/api` | ✅ Implemented |
| Notification Service | 8004 | `/api/v1/notifications` | ✅ Frontend Ready |
| Community Social | 8009 | `/api/v1/community` | ✅ Implemented |
| Care Team | 8008 | `/api/v1/care-team` | ✅ Implemented |
| Cognitive Memory | 8005 | `/api/v1/cognitive` | 🔴 Planned |
| Daily Care | 8006 | `/api/v1/daily-care` | 🔴 Planned |
| Medical Management | 8007 | `/api/v1/medical` | 🔴 Planned |
| Cognitive Memory | 8005 | `/api/v1/cognitive` | 🟡 Partial (Health Records) |
| Daily Care | 8006 | `/api/v1/daily-care` | 🔴 Not Implemented |
| Medical Management | 8007 | `/api/v1/medical` | 🔴 Not Implemented |
| Care Team | 8008 | `/api/v1/care-team` | 🔴 Not Implemented |
| Community Social | 8009 | `/api/v1/community` | 🔴 Not Implemented |

---

*AlzCare Platform | API Reference | Last Updated: 2026-03-03 (Added Camera APIs, updated service status)*
*AlzCare Platform | API Reference | Last Updated: 2026-02-25 (Added HealthRecord + assessment endpoints and doctor patients lookup)*
