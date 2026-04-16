# AlzCare – Alzheimer's Disease Management Platform (Frontend)

## Overview

AlzCare is an intelligent web platform for Alzheimer's disease management, designed to support patients, caregivers, doctors, and administrators through a comprehensive microservices architecture.

This project was developed as part of the **PIDEV – 4th Year Engineering Program** at **Esprit School of Engineering** (Academic Year 2025–2026). It addresses the functional axes of Alzheimer's care through a full-stack application with role-based dashboards, real-time collaboration features, IoT motion detection, and AI-powered assistance.

The platform enables:
- **Patients** to track health metrics, manage medications, participate in community forums, access cognitive games, follow daily care routines, and interact with an AI memory companion
- **Caregivers** to monitor patient behaviors, log incidents with photo evidence, track medication compliance, manage tasks and handovers, and receive safety alerts
- **Doctors** to oversee patient cases, manage prescriptions with drug catalog integration, coordinate habit-based care plans, and track AI-generated autonomy assessments
- **Admins** to manage users, assign care teams, configure camera devices, moderate content, and monitor system analytics

---

## Features

### Patient Features
- **Health Metrics Dashboard** – Track vitals, mood, and wellness indicators
- **Medication Calendar** – Calendar-based medication intake tracking with daily intake status and completion history
- **Daily Care Routines** – View and complete assigned habit routines (morning, evening, activity types)
- **Brain Games** – Five adaptive cognitive game types: Memory Match, Word Recall, Attention Task, Pattern Recognition, Spatial Navigation — with gamification (points, badges, leaderboard, daily challenges)
- **Memory Wallet** – AI-powered memory conversation assistant with storybook generation, quiz mode, and voice command support
- **Self-Assessment** – Patient self-assessment forms for health and autonomy evaluation
- **Appointments** – View and manage scheduled appointments
- **Community Forum** – Discussion platform with post creation, comments, likes, and categories (Advice, Support, Resources, Success Stories, Questions)
- **Profile Management** – Personal health information and care preferences

### Caregiver Features
- **Patient Overview Dashboard** – Quick access to assigned patients and key metrics, with a direct "Log Behavior" shortcut
- **Behavior Tracking** – Log and monitor patient behaviors with image upload (drag-drop, gallery, camera) and severity levels
- **Behavior History** – Review logs with photo thumbnails and full-screen lightbox viewer with keyboard navigation (arrows, escape)
- **Medication Monitoring** – View medication plan compliance and intake history for assigned patients
- **Task Management** – Create and manage care tasks for assigned patients
- **Appointments** – View and manage scheduled caregiver appointments
- **Events** – Track patient events and activity registrations
- **Handovers** – Shift handover notes and transfer records between caregivers
- **Memory Items** – View and manage patient personal memory catalogue (family, places, events)
- **Game Analytics** – View patient cognitive game performance and trends
- **Patient List** – Browse and search all assigned patients

### Doctor Features
- **Patient Cases Dashboard** – Overview of assigned patients via care team, with alerts and key stats
- **Patient Records & Assessments** – View health records and assessment results with PDF export
- **Prescriptions** – Full medication plan management: create/edit plans, add medication items with schedules and dosages, drug search powered by OpenFDA catalog autocomplete
- **Habit Management** – Create habits with structured tasks, set autonomy mode per task (INDEPENDENT / ASSISTED / DEPENDENT), and assign habits to patients
- **Autonomy Assessment** – Review AI-generated (Gemini) autonomy profiles (mobility, hygiene, medication, decision-making), submit and approve/reject suggestions workflow
- **Game Analytics** – Monitor patient cognitive performance per game type and over time
- **Patient Analytics** – Patient-level analytics, history, and trend charts
- **Statistics** – Doctor-level stats: habits per patient, task distribution by autonomy mode and criticality, completion trends
- **Appointments** – Schedule and manage patient appointments
- **Checklist** – Doctor task checklist and follow-up tracking
- **Patient Detail View** – Detailed profile page per assigned patient

### Admin Features
- **System Dashboard** – Overview of platform metrics and activity
- **User Management** – CRUD operations for all user roles (Patient, Caregiver, Doctor, Admin)
- **Medical Records Access** – View and manage patient medical information
- **Care Teams** – Assign doctors and caregivers to patients, manage team composition and roles
- **Camera Devices** – Register and manage IoT camera devices (ESP32-CAM) per patient and zone
- **Camera Provisioning** – Provision and configure new camera devices
- **Routines Management** – Manage daily care routines and habit templates across the system
- **Community Moderation** – Moderate forum posts and comments
- **Notification Schedule Management** – Create and manage scheduled notification campaigns
- **Analytics** – Monitor system-wide metrics and usage statistics
- **Settings** – System configuration and parameters

### Shared Features
- **Real-time Notifications** – Notification bell with polling, toast alerts, and dedicated notification list page
- **Safety Alerts** – Alert creation, acknowledgment, escalation, and resolution with full audit history
- **Landing Page** – Public-facing introduction to the platform
- **Unified Dashboard Entry** – `/dashboard` route auto-redirects to role-appropriate interface
- **Automatic Token Refresh** – Seamless Keycloak OAuth2 session management with silent token refresh (no session timeouts)
- **PDF Export** – Generate PDF reports for patient health records and assessment results
- **Weather & Prayer Card** – Contextual weather and prayer time widget shown on dashboards

---

## Tech Stack

### Frontend
- **Framework**: Angular 18+ (Standalone Components)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Reactive Programming**: RxJS
- **Authentication**: Keycloak OAuth2 / OpenID Connect
- **Build Tool**: Angular CLI
- **Image Handling**: Cloudinary integration for behavior log photo uploads
- **Drug Catalog**: OpenFDA API for medication name search and autocomplete
- **PDF Generation**: jsPDF for client-side report export

### Backend Services Connected

| Service | Port | Description |
|---------|------|-------------|
| Identity Service | 8001 | User management, roles, patient/caregiver/doctor profiles |
| Event Ingestion Service | 8002 | Receives ESP32-CAM motion events and snapshots |
| Safety Alert Engine | 8003 | Behavior logs, safety alerts, incident tracking |
| Notification Service | 8004 | Notification delivery and scheduled campaigns |
| Cognitive Memory Service | 8005 | Games, gamification, memory items, health records, AI conversations |
| Daily Care Service | 8006 | Habit management, completions, autonomy assessments, AI suggestions |
| Medical Management Service | 8007 | Appointments, medication plans, medication intake tracking |
| Care Team Service | 8008 | Doctor-patient and caregiver-patient assignments |
| Community Social Service | 8009 | Forum posts, comments, likes, moderation |

All backend communication is routed through the **Spring Cloud Gateway (Port 8080)** using a local Angular proxy (`/api`).

---

## Architecture

The frontend is a single Angular SPA that communicates exclusively through the API Gateway. Role-based route guards ensure each user only accesses their designated module.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        ANGULAR SPA (Port 4200)                        │
├──────────────┬───────────────┬──────────────┬────────────────────────┤
│  Patient     │  Caregiver    │  Doctor      │  Admin                 │
│  Module      │  Module       │  Module      │  Module                │
│              │               │              │                        │
│  Dashboard   │  Dashboard    │  Dashboard   │  Dashboard             │
│  Medications │  Behaviors    │  Patients    │  Users                 │
│  Routines    │  Medications  │  Prescriptions│  Care Teams           │
│  Games       │  Tasks        │  Habits      │  Camera Devices        │
│  Memory      │  Handovers    │  Assessments │  Routines              │
│  Wallet      │  Events       │  Analytics   │  Schedules             │
│  Community   │  Patients     │  Statistics  │  Community             │
│  Profile     │  Analytics    │  Appointments│  Analytics             │
└──────┬───────┴───────┬───────┴──────┬───────┴───────┬────────────────┘
       │               │              │               │
       └───────────────┴──────────────┴───────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│               Spring Cloud Gateway  /api  (Port 8080)                │
│           (JWT validation, routing, load balancing)                   │
└──────────────────────────────────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
   Identity / Care Team   Daily Care / Medical   Cognitive / Community
   Services (8001, 8008)  Services (8006, 8007)  Services (8005, 8009)
```

### Key Design Patterns
- **Standalone Components** – No NgModule-based structure; each component declares its own imports
- **Role Guards** – Route-level access control based on decoded JWT roles
- **Context Services** – `DoctorPatientContextService` and `CaregiverPatientContextService` maintain cross-component patient selection state
- **localStorage Fallback** – Habit assignments and habit catalog cached locally to handle backend RBAC restrictions in development

---

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/        # Auth and role-based route guards
│   │   ├── interceptors/  # HTTP auth interceptor (JWT injection)
│   │   ├── models/        # Data models (api, daily-care, medical-followup, care-team, safety-alert, camera-device, etc.)
│   │   └── services/      # Auth, API, DailyCare, MedicalFollowup, CareTeam, OpenFDA, Notification, SafetyAlert, PdfExport, etc.
│   ├── modules/
│   │   ├── auth/          # Login, invite acceptance
│   │   ├── landing/       # Public landing page
│   │   ├── alerts/        # Alert list, pending validations
│   │   ├── patient/       # Dashboard, medications, routines, games, memory-wallet, assessments, appointments, community, profile
│   │   ├── caregiver/     # Dashboard, behaviors, medications, tasks, appointments, events, handovers, memory-items, patients
│   │   ├── doctor/        # Dashboard, patients, prescriptions, habits, records, assessments, game-analytics, statistics, appointments, checklist
│   │   └── admin/         # Dashboard, users, caregivers, care-teams, camera-devices, routines, schedules, community, medical, analytics, settings
│   ├── shared/
│   │   └── components/    # Navbar, stat-card, alert-card, notification-bell, safety-alert-bell, toast, weather-prayer-card, confirm-dialog, etc.
│   ├── app.component.*
│   └── app.routes.ts
├── assets/
├── environments/
└── styles.css
```

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Angular CLI (`npm install -g @angular/cli`)
- Backend stack running (see [backend repository](https://github.com/arijjuili/ESPRIT-BACKEND-4SAE1-4EME-ALZCARE))

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/arijjuili/ESPRIT-FRONTEND-4SAE1-4EME-ALZCARE.git
cd ESPRIT-FRONTEND-4SAE1-4EME-ALZCARE

# Install dependencies
npm install

# Start development server
ng serve
```

Navigate to **http://localhost:4200**. The Angular proxy forwards all `/api` requests to `http://localhost:8080` (API Gateway).

### Build for Production

```bash
ng build --configuration production
```

### Running Tests

```bash
# One-shot CI run
npx ng test --no-watch

# Watch mode (re-runs on file changes)
npx ng test
```

See [TESTING.md](TESTING.md) for the full testing guide covering Karma + Jasmine setup, writing service and component tests, and troubleshooting.

### Access Points

| Service | URL |
|---------|-----|
| Web Application | http://localhost:4200 |
| API Gateway | http://localhost:8080 |
| Keycloak Admin | http://localhost:8090 |
| Eureka Dashboard | http://localhost:8761 |
| RabbitMQ Management | http://localhost:15672 |

---

## Contributors

| Name |
|------|
| **Iheb Jlassi** |
| **Yosser Khaldi** |
| **Salma Louhichi** |
| **Arij Juili** |
| **Roudaina Saoudi** |
| **Mouhib Lafi** |

---

## Academic Context

This project was developed at **Esprit School of Engineering – Tunisia** as part of the **PIDEV – 4SAE (4th Year Engineering)** program for the academic year **2025–2026**.

**Supervisor**: Mr. Alaa RAMI

**Project Type**: Full-Stack Web Application with Microservices Architecture + IoT Integration

**Evaluation Criteria**:
- Technical Architecture and Design Patterns
- Implementation Quality and Code Organization
- Feature Completeness and User Experience
- Documentation and Project Management

---

## Acknowledgments

- **Esprit School of Engineering** for providing the academic framework and resources for this project
- Our professors and supervisors for their guidance throughout the development process
- The open-source community for the amazing tools and libraries that made this project possible:
  - Angular and the RxJS team
  - Tailwind CSS for rapid UI development
  - Keycloak for robust identity management
  - Cloudinary for image upload infrastructure
  - OpenFDA for the public drug catalog API
  - jsPDF for client-side PDF generation

---

*AlzCare Platform – Built with care for those who need it most.*
