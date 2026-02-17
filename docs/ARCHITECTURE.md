# CareHub - Architecture Overview

**Project:** Alzheimer Care Platform - Academic Project  
**Tech Stack:** Angular 18 + TypeScript + Tailwind CSS  
**Status:** ✅ Production Ready

---

## Project Structure

```
alzheimerApp/src/app/
├── core/
│   ├── models/           # TypeScript interfaces (User, Patient, API models)
│   │   ├── user.model.ts
│   │   ├── api.model.ts
│   │   └── user-management.model.ts
│   ├── services/         # AuthService, ApiService, DataService, UserManagementService
│   ├── guards/           # AuthGuard for protected routes
│   └── interceptors/     # AuthInterceptor for JWT handling
├── modules/
│   ├── auth/             # Login component
│   ├── landing/          # Landing page
│   ├── patient/          # 7 components organized by page folder
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── activities/
│   │   ├── medications/
│   │   ├── games/
│   │   ├── community/
│   │   └── profile/
│   ├── caregiver/        # 2 components organized by page folder
│   │   ├── layout/
│   │   └── dashboard/
│   ├── doctor/           # 2 components organized by page folder
│   │   ├── layout/
│   │   └── dashboard/
│   └── admin/            # 9 components organized by page folder
│       ├── layout/
│       ├── dashboard/
│       ├── medical/
│       ├── caregivers/
│       ├── interactive/
│       ├── community/
│       ├── users/
│       ├── analytics/
│       └── settings/
├── shared/
│   └── components/       # Reusable: Navbar, StatCard, AlertCard, PatientSidebar
├── app.routes.ts         # Route definitions
└── app.component.ts      # Root component
```

---

## Key Statistics

| Metric | Count |
|--------|-------|
| Total Components | 24+ |
| Admin Dashboard Pages | 8 (Medical, Caregivers, Interactive, Community, Users, Analytics, Settings) |
| Patient Pages | 6 (Dashboard, Activities, Medications, Games, Community, Profile) |
| Routes | 17+ |
| Profile Types | 3 (Patient, Doctor, Caregiver) |
| Services | 4 (Auth, Api, Data, UserManagement) |
| Guards/Interceptors | 2 (AuthGuard, AuthInterceptor) |
| Models | 10+ TypeScript interfaces |

---

## Tech Stack

- **Framework:** Angular 18 (Standalone Components)
- **Language:** TypeScript ~5.4
- **Styling:** Tailwind CSS 3.3 + SCSS
- **State:** RxJS BehaviorSubjects (Auth, Data services)
- **Icons:** Unicode emoji
- **Auth:** Keycloak OAuth2 + JWT

---

## Architecture Decisions

### Standalone Components
Modern Angular pattern with better tree-shaking and cleaner code. No NgModules.

### Service-First Approach
Real API integration via `ApiService` with proper error handling and fallback to mock data when needed.

### Role-Based Access & Theming
4 user roles with dedicated dashboards and **consistent color themes**:

| Role | Theme Color | Dashboard Background | Sidebar Accent | Focus Area |
|------|-------------|---------------------|----------------|------------|
| **Patient** | Teal `#14b8a6` | Teal-tinted gradient | Teal accents | Health metrics, medications, tasks |
| **Caregiver** | Emerald `#10b981` | Emerald-tinted gradient | Green accents | Patient management, task tracking |
| **Doctor** | Blue `#3b82f6` | Blue-tinted gradient | Blue accents | Medical records, prescriptions |
| **Admin** | Violet `#8b5cf6` | Violet-tinted gradient | Purple accents | User management, system monitoring |

**Implementation:** 
- **Sidebar:** Single `NavbarComponent` uses CSS variables bound to role-specific color tokens
- **Dashboard Backgrounds:** Each layout component defines `--role-primary-light` CSS variable
- **Consistency:** Both sidebar and dashboard use the same color tokens from DESIGN_SYSTEM.md

---

## Module Details

### Patient Module (7 Components)
| Component | Purpose |
|-----------|---------|
| `patient-layout` | Layout wrapper with role-themed sidebar |
| `patient-dashboard` | Main dashboard with health metrics, appointments, medications |
| `patient-activities` | Daily tasks and activity tracking |
| `patient-medications` | Medication schedule and management |
| `patient-games` | Cognitive games hub (6 brain games) |
| `patient-community` | Social feed and support groups |
| `patient-profile` | Personal info, settings, preferences |

### Admin Module (9 Components)
| Component | Purpose | Route |
|-----------|---------|-------|
| `admin-layout` | Admin layout wrapper |
| `admin-dashboard` | System overview with 12-axis management | `/admin/dashboard` |
| `admin-medical` | Medical axes (1, 2, 3, 4, 6, 10) | `/admin/medical` |
| `admin-caregivers` | Caregiver management & daily routines | `/admin/caregivers` |
| `admin-interactive` | Games, memory wallet, activities | `/admin/interactive` |
| `admin-community` | Forum management & moderation | `/admin/community` |
| `admin-users` | User management & role distribution | `/admin/users` |
| `admin-analytics` | System metrics & reporting | `/admin/analytics` |
| `admin-settings` | Platform configuration | `/admin/settings` |

### Caregiver Module (2 Components)
| Component | Purpose |
|-----------|---------|
| `caregiver-layout` | Layout wrapper |
| `caregiver-dashboard` | Patient list, care tasks, schedules |

### Doctor Module (2 Components)
| Component | Purpose |
|-----------|---------|
| `doctor-layout` | Layout wrapper |
| `doctor-dashboard` | Medical records, patient prescriptions |

### Auth Module (1 Component)
| Component | Purpose |
|-----------|---------|
| `login` | Keycloak OAuth2 login with mock fallback |

### Landing Module (1 Component)
| Component | Purpose |
|-----------|---------|
| `landing` | Public landing page with CTA |

### Shared Components (4 Components)
| Component | Purpose |
|-----------|---------|
| `navbar` | Role-aware sidebar navigation with collapse |
| `stat-card` | Reusable stat display card |
| `alert-card` | Notification/alert display |
| `patient-sidebar` | Patient-specific sidebar variant |

---

## Admin Dashboard: 12-Axis Management System

The admin dashboard provides comprehensive management for all 12 application axes:

| Category | Axes | Description |
|----------|------|-------------|
| **Medical Management** | 1, 2, 3, 4, 6, 10 | Medications, Appointments, Behavior, Alerts, Doctors, Patients |
| **Care & Support** | 5, 9 | Caregiver Management, Daily Routines |
| **Interactive Features** | 7, 8, 12 | Cognitive Games, Memory Wallet, Social Activities |
| **Community & Content** | 11 | Community Forum |

---

## Backend Integration

### API Architecture
- **Gateway:** All requests proxied through `/api` → `http://localhost:8080`
- **Keycloak:** Auth requests through `/realms` → `http://localhost:8090`
- **Identity Service:** Patient/Doctor/Caregiver profiles + Autonomy assessments

### Services Integration Status

| Service | Port | Base Path | Status |
|---------|------|-----------|--------|
| Identity Service | 8001 | `/api/v1` | ✅ Implemented |
| Event Ingestion | 8002 | `/api/v1/events` | 🔴 Not Implemented |
| Safety Alert Engine | 8003 | `/api/v1/safety` | 🔴 Not Implemented |
| Notification Service | 8004 | `/api/v1/notifications` | 🔴 Not Implemented |
| Cognitive Memory | 8005 | `/api/v1/cognitive` | 🔴 Not Implemented |
| Daily Care | 8006 | `/api/v1/daily-care` | 🔴 Not Implemented |
| Medical Management | 8007 | `/api/v1/medical` | 🔴 Not Implemented |
| Care Team | 8008 | `/api/v1/care-team` | 🔴 Not Implemented |
| Community Social | 8009 | `/api/v1/community` | 🔴 Not Implemented |

---

## Known Issues & Fixes

### Issue #1: Invalid Angular Version (2026-02-10)
**Problem:** package.json had non-existent Angular 21 versions  
**Fix:** Downgraded to stable Angular 18 (^18.2.0)

### Issue #2: Inline Templates (2026-02-10)
**Problem:** All components used inline HTML/CSS  
**Fix:** Refactored to separate template/style files (42+ new files)

---

## 🤖 Agent Instructions (For AI Assistant)

### When to Read This File
- **At the start of every session** - Understand project structure and tech stack
- **Before major changes** - Check architecture decisions
- **When adding new features** - Verify component placement (core/modules/shared)

### When to Update This File
- **New architecture decisions** - Add to "Architecture Decisions" section
- **Project structure changes** - Update folder tree and component counts
- **New services/backend integration** - Update "Services Integration Status"
- **New known issues** - Add to "Known Issues & Fixes" with date
- **Tech stack changes** - Update versions in "Tech Stack"

### What NOT to Change
- Historical fixes in "Known Issues" (append only)
- Existing structure diagrams (update only if changed)

---

*Last Updated: 2026-02-17*
