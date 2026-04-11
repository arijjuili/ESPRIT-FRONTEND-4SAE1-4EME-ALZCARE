# Medical Follow-up Use Cases - User Guide

> This guide explains how to use the components connected to the `medical-followup-ms` microservice

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Use Case 1: Appointment Management (Doctor)](#use-case-1-appointment-management-doctor)
3. [Use Case 2: Prescription Management (Doctor)](#use-case-2-prescription-management-doctor)
4. [Use Case 3: Medication Tracking (Patient)](#use-case-3-medication-tracking-patient)
5. [Backend Integration](#backend-integration)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Start the Backend

```bash
cd medical-followup-ms
./mvnw spring-boot:run
# Server starts on port 8081
```

### 2. Start the Frontend

```bash
cd alzheimerApp-frontend
ng serve
# Server starts on port 4200
```

### 3. Access the Use Cases

| Use Case | URL | Role |
|----------|-----|------|
| Appointments | `http://localhost:4200/doctor/appointments` | Doctor |
| Prescriptions | `http://localhost:4200/doctor/prescriptions` | Doctor |
| Medications | `http://localhost:4200/patient/medications` | Patient |

---

## Use Case 1: Appointment Management (Doctor)

### Component: `DoctorAppointmentsComponent`

**File:** `src/app/modules/doctor/appointments/`

#### Features

✅ **List Appointments**
- Filter by status (REQUESTED, CONFIRMED, COMPLETED, CANCELLED, etc.)
- Filter by date range
- Automatic sorting by date

✅ **Create Appointment**
- Select patient (by ID)
- Select caregiver (optional)
- Consultation type: ROUTINE, FOLLOW_UP, COGNITIVE_TEST, EMERGENCY
- Priority: LOW, MEDIUM, HIGH, CRITICAL
- Mode: IN_PERSON, ONLINE, PHONE
- Meeting URL (if ONLINE)

✅ **Manage Status**
- Confirm appointment (REQUESTED → CONFIRMED)
- Mark as completed (CONFIRMED → COMPLETED)
- Cancel appointment

#### Workflow

```
1. Doctor logs in → /doctor/appointments
2. View list of appointments for the month
3. Click "New Appointment"
4. Fill the form:
   - Patient ID: 1
   - Type: ROUTINE
   - Priority: HIGH
   - Mode: IN_PERSON
   - Start: 2026-02-25T10:00
   - End: 2026-02-25T11:00
5. Click "Create Appointment"
6. Appointment appears in the list
7. Available actions: Confirm, Complete, Cancel
```

#### Code Example

```typescript
// Inject service
constructor(private medicalService: MedicalFollowupService) {}

// Create appointment
const appointment: AppointmentCreateRequest = {
  patientId: 1,
  doctorId: 1,
  type: AppointmentType.ROUTINE,
  priority: AppointmentPriority.HIGH,
  mode: AppointmentMode.IN_PERSON,
  startAt: '2026-02-25T10:00:00',
  endAt: '2026-02-25T11:00:00'
};

this.medicalService.createAppointment(appointment)
  .subscribe(newAppointment => {
    console.log('Appointment created:', newAppointment);
  });
```

---

## Use Case 2: Prescription Management (Doctor)

### Component: `DoctorPrescriptionsComponent`

**File:** `src/app/modules/doctor/prescriptions/`

#### Features

✅ **Create Medication Plan**
- Plan title
- Patient ID
- Start/end dates
- Autonomy level: INDEPENDENT, ASSISTED, DEPENDENT
- Notes

✅ **Add Medications**
- Name and dosage
- Frequency: DAILY, WEEKLY, CUSTOM
- Intake times (CSV): "MORNING,EVENING"
- Initial stock and alert threshold
- "High risk" flag

✅ **Manage Plans**
- View patient's plans
- Delete medications
- Delete complete plan

#### Workflow

```
1. Doctor logs in → /doctor/prescriptions
2. Search plans by Patient ID
3. OR create new plan:
   - Click "New Plan"
   - Fill: Title, Patient ID, Dates, Autonomy
   - Click "Create Plan"
4. Select plan from list
5. Add medications:
   - Name: Donepezil
   - Dosage: 10mg
   - Frequency: DAILY
   - Times: MORNING,EVENING
   - Stock: 30, Threshold: 5
6. Medication appears in table
```

#### Code Example

```typescript
// Create plan
const plan: MedicationPlanCreateRequest = {
  patientId: 1,
  doctorId: 1,
  title: 'Alzheimer Treatment - Phase 1',
  notes: 'Start with low dose',
  startDate: '2026-02-20',
  endDate: '2026-05-20',
  autonomyLevel: MedicationAutonomyLevel.ASSISTED
};

this.medicalService.createMedicationPlan(plan)
  .subscribe(newPlan => {
    console.log('Plan created:', newPlan);
    
    // Add medication
    const item: MedicationItemCreateRequest = {
      name: 'Donepezil',
      dosage: '10mg',
      frequency: FrequencyType.DAILY,
      timesOfDay: 'MORNING,EVENING',
      isHighRisk: false,
      stockQuantity: 30,
      lowThreshold: 5
    };
    
    this.medicalService.addMedicationItem(newPlan.id, item)
      .subscribe(newItem => {
        console.log('Medication added:', newItem);
      });
  });
```

---

## Use Case 3: Medication Tracking (Patient)

### Component: `PatientMedicationsComponent`

**File:** `src/app/modules/patient/medications/`

#### Features

✅ **View Medication Plans**
- List of active plans
- Status of each plan
- Required autonomy level

✅ **Medication Details**
- Name and dosage
- Frequency and intake times
- Available stock with alerts

✅ **Intake Tracking**
- Next intakes to perform
- Status: PENDING, TAKEN, MISSED, DELAYED
- History

✅ **Offline Mode**
- If backend is unavailable
- Display mock data
- Warning message

#### Workflow

```
1. Patient logs in → /patient/medications
2. View list of medication plans
3. For each plan:
   - View included medications
   - Check available stock
   - View intake times
4. Track adherence rate
5. Receive low stock alerts
```

#### Adaptive Interface

The component automatically adapts:

```typescript
// If backend available
if (backendAvailable) {
  // Display real MedicationPlan, MedicationItem, MedicationIntake
  // With real-time calculated stats
} else {
  // Fallback to existing mock data
  // Message: "Offline mode - Displaying demo data"
}
```

---

## Backend Integration

### Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────────┐
│   Frontend      │────▶│   Proxy      │────▶│  medical-followup   │
│   (Port 4200)   │     │  (Proxy conf)│     │  -ms (Port 8081)    │
└─────────────────┘     └──────────────┘     └─────────────────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  /api        │ → Identity Service (8080)
                        │  /api/followup│ → Medical Followup (8081)
                        └──────────────┘
```

### Proxy Configuration

```json
// proxy.conf.json
{
  "/api": {
    "target": "http://127.0.0.1:8080",
    "secure": false,
    "changeOrigin": true
  },
  "/api/followup": {
    "target": "http://127.0.0.1:8081",
    "secure": false,
    "changeOrigin": true
  }
}
```

### Angular Service

```typescript
// MedicalFollowupService
private baseUrl = `${environment.apiUrl}/followup`; // /api/followup

// Available methods
- Appointments: create, get, list, update, delete, changeStatus
- Medication Plans: create, get, update, delete
- Medication Items: add, get, update, delete
- Medication Intakes: add, get, update, delete
```

---

## Troubleshooting

### Issue: "Error loading"

**Cause:** Backend not started or wrong port

**Solution:**
```bash
# Verify backend is running on port 8081
curl http://localhost:8081/api/appointments

# If error, restart:
cd medical-followup-ms
./mvnw spring-boot:run
```

### Issue: "CORS Error"

**Cause:** Backend doesn't accept requests from frontend

**Solution:**
- Verify `CorsConfig.java` is present in backend
- Restart backend after adding CORS config

### Issue: "404 Not Found"

**Cause:** Endpoints changed or proxy not configured

**Solution:**
- Verify `proxy.conf.json` contains `/api/followup`
- Verify URLs in `MedicalFollowupService`
- Restart `ng serve` after proxy modification

### Issue: "Mock data displayed"

**Cause:** Backend unreachable, fallback activated

**Solution:**
- Check console for actual error
- Ensure backend is running
- Verify port in `application.yml` (8081)

---

## 📊 Component Summary

| Component | Route | Function | Backend |
|-----------|-------|----------|---------|
| DoctorAppointmentsComponent | `/doctor/appointments` | Appointment CRUD | ✅ appointments API |
| DoctorPrescriptionsComponent | `/doctor/prescriptions` | Plans + Medications | ✅ medication API |
| PatientMedicationsComponent | `/patient/medications` | Patient view | ✅ medication API + fallback |

---

## 🔗 Useful Links

- [API Documentation](./ENDPOINTS.md)
- [Architecture Overview](./ARCHITECTURE.md)
- Backend: `medical-followup-ms/src/main/java/...`
- Models: `alzheimerApp-frontend/src/app/core/models/medical-followup.model.ts`
- Service: `alzheimerApp-frontend/src/app/core/services/medical-followup.service.ts`

---

*Last updated: 2026-02-18*
