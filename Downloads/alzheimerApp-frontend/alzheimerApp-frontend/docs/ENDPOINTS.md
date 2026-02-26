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

## Medical Follow-up Service APIs

Base path: `/api/followup` (proxied to medical-followup-ms on port 8081)

### Appointments API

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/appointments` | POST | Create new appointment | ✅ DOCTOR/ADMIN |
| `/appointments/{id}` | GET | Get appointment by ID | ✅ Any role |
| `/appointments` | GET | List appointments (by doctor/patient/caregiver + date range) | ✅ Any role |
| `/appointments/{id}` | PUT | Update appointment | ✅ DOCTOR/ADMIN |
| `/appointments/{id}` | DELETE | Delete appointment | ✅ DOCTOR/ADMIN |
| `/appointments/{id}/status` | PATCH | Change appointment status | ✅ Any role |

#### Create Appointment
```http
POST /api/followup/appointments
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 1,
  "doctorId": 2,
  "caregiverId": 3,
  "type": "ROUTINE",
  "priority": "HIGH",
  "mode": "IN_PERSON",
  "startAt": "2026-02-20T10:00:00",
  "endAt": "2026-02-20T11:00:00"
}
```

#### List Appointments (by patient)
```http
GET /api/followup/appointments?patientId=1&from=2026-02-01T00:00:00&to=2026-02-28T23:59:59
Authorization: Bearer <token>
```

#### Change Appointment Status
```http
PATCH /api/followup/appointments/1/status?status=CONFIRMED
Authorization: Bearer <token>
```

### Medication Plans API

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/medication/plans` | POST | Create medication plan | ✅ DOCTOR |
| `/medication/plans/{id}` | GET | Get plan by ID | ✅ Any role |
| `/medication/plans` | GET | Get plans by patient ID | ✅ Any role |
| `/medication/plans/{id}` | PUT | Update plan | ✅ DOCTOR |
| `/medication/plans/{id}` | DELETE | Delete plan | ✅ DOCTOR |

#### Create Medication Plan
```http
POST /api/followup/medication/plans
Authorization: Bearer <token>
Content-Type: application/json

{
  "patientId": 1,
  "doctorId": 2,
  "title": "Traitement Alzheimer - Phase 1",
  "notes": "Commencer avec dose faible",
  "startDate": "2026-02-20",
  "endDate": "2026-05-20",
  "autonomyLevel": "ASSISTED"
}
```

### Medication Items API

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/medication/plans/{planId}/items` | POST | Add item to plan | ✅ DOCTOR |
| `/medication/plans/{planId}/items` | GET | Get items in plan | ✅ Any role |
| `/medication/items/{id}` | PUT | Update item | ✅ DOCTOR |
| `/medication/items/{id}` | DELETE | Delete item | ✅ DOCTOR |

#### Add Medication Item
```http
POST /api/followup/medication/plans/1/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Donepezil",
  "dosage": "5mg",
  "frequency": "DAILY",
  "timesOfDay": "MORNING,EVENING",
  "isHighRisk": false,
  "stockQuantity": 30,
  "lowThreshold": 5,
  "expirationDate": "2026-12-31"
}
```

### Medication Intakes API

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/medication/items/{itemId}/intakes` | POST | Add intake schedule | ✅ DOCTOR/CAREGIVER |
| `/medication/items/{itemId}/intakes` | GET | Get intakes for item | ✅ Any role |
| `/medication/intakes/{id}` | PUT | Update intake status | ✅ Any role |
| `/medication/intakes/{id}` | DELETE | Delete intake | ✅ DOCTOR |

#### Record Medication Intake
```http
POST /api/followup/medication/items/1/intakes
Authorization: Bearer <token>
Content-Type: application/json

{
  "scheduledAt": "2026-02-20T08:00:00",
  "status": "TAKEN",
  "confirmedByRole": "CAREGIVER"
}
```

### TypeScript Models (Frontend)

```typescript
// Enums
enum AppointmentStatus { REQUESTED, ACCEPTED, REJECTED, CONFIRMED, COMPLETED, CANCELLED }
enum AppointmentType { ROUTINE, FOLLOW_UP, COGNITIVE_TEST, EMERGENCY }
enum AppointmentPriority { LOW, MEDIUM, HIGH, CRITICAL }
enum AppointmentMode { IN_PERSON, ONLINE, PHONE }
enum PlanStatus { ACTIVE, SUSPENDED, STOPPED }
enum FrequencyType { DAILY, WEEKLY, CUSTOM }
enum IntakeStatus { PENDING, TAKEN, DELAYED, MISSED, REFUSED }
enum MedicationAutonomyLevel { INDEPENDENT, ASSISTED, DEPENDENT }

// Interfaces
interface Appointment {
  id: number;
  patientId: number;
  doctorId: number;
  caregiverId?: number;
  type: AppointmentType;
  priority: AppointmentPriority;
  mode: AppointmentMode;
  status: AppointmentStatus;
  startAt: string;
  endAt: string;
  meetingUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface MedicationPlan {
  id: number;
  patientId: number;
  doctorId: number;
  title: string;
  notes?: string;
  startDate: string;
  endDate?: string;
  autonomyLevel: MedicationAutonomyLevel;
  status: PlanStatus;
  version: number;
  items?: MedicationItem[];
}

interface MedicationItem {
  id: number;
  planId: number;
  name: string;
  dosage: string;
  frequency: FrequencyType;
  timesOfDay: string;
  isHighRisk: boolean;
  stockQuantity: number;
  lowThreshold: number;
  intakes?: MedicationIntake[];
}

interface MedicationIntake {
  id: number;
  itemId: number;
  scheduledAt: string;
  status: IntakeStatus;
  confirmedByRole?: ValidatorRole;
}
```

---

## Coming Soon (Other Services)

| Service | Port | Base Path | Status |
|---------|------|-----------|--------|
| Event Ingestion | 8002 | `/api/v1/events` | 🔴 Not Implemented |
| Safety Alert Engine | 8003 | `/api/v1/safety` | 🔴 Not Implemented |
| Notification Service | 8004 | `/api/v1/notifications` | 🔴 Not Implemented |
| Cognitive Memory | 8005 | `/api/v1/cognitive` | 🔴 Not Implemented |
| Daily Care | 8006 | `/api/v1/daily-care` | 🔴 Not Implemented |
| Care Team | 8008 | `/api/v1/care-team` | 🔴 Not Implemented |
| Community Social | 8009 | `/api/v1/community` | 🔴 Not Implemented |

---

*AlzCare Platform | API Reference | Last Updated: 2026-02-18*
