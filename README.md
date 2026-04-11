# 🫀 Alzheimer Care App

A comprehensive care management platform designed to support patients with Alzheimer's disease and their caregivers. Built with Angular, Tailwind CSS, and TypeScript.

## 🎯 Features

### Patient Dashboard
- **Health Metrics**: Track vitals, mood, and wellness indicators
- **Medications**: Organized prescription management and schedules
- **Daily Activities**: Task tracking and activity logs
- **Brain Games**: Cognitive exercises for mental stimulation
- **Community**: Connect with other patients for support
- **Profile**: Personal health information management

### Caregiver Dashboard
- **Patient Management**: Monitor multiple patients' health
- **Task Management**: Assign and track care tasks
- **Care Schedule**: Calendar view of care activities
- **Patient List**: Quick access to patient information

### Doctor & Admin Dashboards
- **Patient Records**: Access and manage medical records
- **Schedule Management**: Appointment and consultation booking
- **Teleconsultation**: Online video consultations via Jitsi integration
  - Doctors can create ONLINE or ONSITE appointments
  - Automatic Jitsi meeting link generation for confirmed online appointments
  - One-click join meeting for patients and caregivers
  - Copy meeting link functionality for doctors
- **User Management** (Admin): Manage system users and roles
- **Analytics**: Monitor system-wide metrics

## 🛠️ Tech Stack

- **Frontend**: Angular 18+ (Standalone Components)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Build Tool**: Angular CLI
- **Version Control**: Git

## 📦 Project Structure

```
src/
├── app/
│   ├── core/              # Services, guards, interceptors
│   │   ├── services/
│   │   │   └── medical-followup.service.ts  # Appointments & teleconsultation API
│   │   └── models/
│   │       └── medical-followup.model.ts    # Appointment, AppointmentMode, etc.
│   ├── modules/           # Feature modules (patient, caregiver, doctor, admin)
│   │   ├── doctor/appointments/             # Doctor appointment management
│   │   ├── patient/dashboard/               # Patient dashboard with teleconsultation
│   │   └── caregiver/dashboard/             # Caregiver dashboard with appointments
│   ├── shared/            # Shared components (navbar, sidebar, cards)
│   └── models/            # Data models
├── assets/                # Images, icons, static files
└── styles/                # Global styles and Tailwind config
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Angular CLI

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/alzheimer-care-app.git
cd alzheimer-care-app

# Install dependencies
npm install

# Start development server
ng serve

# Navigate to http://localhost:4200
```

### Build for Production

```bash
ng build --configuration production
```

## 🔐 Authentication

The app supports role-based access control:
- **Patient**: View own health data and activities
- **Caregiver**: Manage assigned patients
- **Doctor**: Access medical records and consultations
- **Admin**: System administration and user management

## 📹 Teleconsultation Module

The teleconsultation feature enables secure online video consultations between doctors and patients using Jitsi Meet.

### Jitsi Teleconsultation API (How It Works)

This project does **not** host Jitsi itself. We generate a **Jitsi room URL** in the backend and store it on the appointment.

**Where the link lives**
- Backend persists the link in `appointment.meetingUrl` (DB column `meeting_url`).
- Frontend reads `meetingUrl` (and also accepts `meetingLink` for backward compatibility).

**When the link is generated**
- Only for appointments with:
  - `mode = ONLINE`
  - `status = CONFIRMED`
- The backend generates a unique room name and builds the URL as:
  - `${JITSI_BASE_URL}/${roomName}` (default base: `https://meet.jit.si`)

**Backend endpoints used for teleconsultation**
All routes are under the medical-followup microservice (aka `medical-followup-ms` / `medical-management` service):

```http
PATCH /api/v1/appointments/{id}/status?status=CONFIRMED
  - Confirms an appointment.
  - For ONLINE appointments, the backend generates & persists `meetingUrl`.

GET /api/v1/appointments/{id}
  - Returns the appointment details (including `meetingUrl` when available).

GET /api/v1/appointments/{id}/teleconsultation/link?userId={patientOrDoctorId}
  - Returns the meeting link payload.
  - Response may include `meetingUrl` and/or `meetingLink`.
```

Optional (doctor-only) endpoint (if enabled in your running backend):

```http
POST /api/v1/appointments/{id}/teleconsultation/regenerate?doctorId={doctorId}
  - Forces a new link to be generated and persisted.
```

**Backend configuration**
These are defined in `medical-followup-ms` config:

```text
JITSI_BASE_URL=https://meet.jit.si
TELECONSULTATION_ROOM_PREFIX=alzcare
```

**Frontend integration points**
- API client: `src/app/core/services/medical-followup.service.ts`
- Doctor UI: `src/app/modules/doctor/appointments/doctor-appointments.component.ts`
- Patient UI: `src/app/modules/patient/appointments/patient-appointments.component.ts`

### Features

| Feature | Doctor | Patient | Caregiver |
|---------|--------|---------|-----------|
| Create ONLINE appointment | ✅ | ❌ | ❌ |
| View mode badges (ONLINE/ONSITE) | ✅ | ✅ | ✅ |
| Confirm appointment | ✅ | ❌ | ❌ |
| Auto-generate Jitsi link | ✅ (backend) | - | - |
| Copy meeting link | ✅ | ❌ | ❌ |
| Join meeting | ✅ | ✅ | ✅ |
| View meeting status | ✅ | ✅ | ✅ |

### Appointment Flow

1. **Doctor** creates an appointment with mode `ONLINE` or `ONSITE`
2. **Patient/Caregiver** sees the appointment with status `REQUESTED`
3. **Doctor** confirms the ONLINE appointment
4. **Backend** automatically generates a unique Jitsi meeting URL
5. **Patient/Caregiver** sees "✅ Ready to join" with a "Join Meeting" button
6. All participants click "Join Meeting" to open Jitsi in a new tab

### Backend Integration

The frontend communicates with the medical-followup-ms microservice:

```typescript
// Key API endpoints used
POST   /appointments                    // Create appointment
PATCH  /appointments/{id}/status        // Confirm/Cancel/Complete
GET    /appointments/{id}               // Get appointment details
GET    /appointments?patientId=...      // List patient appointments
```

### Data Models

```typescript
enum AppointmentMode {
  ONSITE = 'ONSITE',  // In-person consultation
  ONLINE = 'ONLINE'   // Video consultation
}

enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

interface Appointment {
  id: number;
  patientId: string;
  doctorId: number;
  mode: AppointmentMode;      // ONLINE or ONSITE
  status: AppointmentStatus;
  meetingUrl?: string;        // Jitsi link (auto-generated for confirmed ONLINE)
  startAt: string;
  endAt: string;
  // ... other fields
}
```

## 📝 Latest Updates

### Session 3: 2026-03-16 - Teleconsultation Module
- ✅ **Teleconsultation Support**: Full integration of online video consultations
  - Added `AppointmentMode` (ONSITE/ONLINE) and `meetingUrl` fields
  - Doctor interface: Create online appointments with automatic Jitsi link generation
  - Doctor interface: Copy link and Join meeting actions for confirmed appointments
  - Patient interface: View appointment mode badges and join online consultations
  - Caregiver interface: Monitor patient appointments and join teleconsultations
  - Status indicators: REQUESTED, CONFIRMED, CANCELLED, COMPLETED
  - Visual badges for ONLINE 💻 and ONSITE 🏥 appointments
  - Responsive teleconsultation cards with state-based UI (ready/pending/cancelled)

### Session 2: 2026-02-07
- ✅ Fixed NG5002 & TS2769 parser errors
- ✅ Refactored navbar with collapsible sidebar
- ✅ Made dashboards fully mobile-responsive
- ✅ Unified sidebar for all user roles
- ✅ Fixed desktop layout issues (sidebar overlay)

See `progress.md` for detailed changelog.

## 🤝 Contributing

This is an educational project. Contributions and suggestions are welcome!

## 📄 License

MIT License - feel free to use this project for learning and development.

## 👨‍💻 Author

**Iheb** - Software Engineering Student

---

Built with ❤️ for caring for those who need it most.
