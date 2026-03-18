# AlzheimerApp Frontend - Master Reference

> **Quick Start**: Load `docs/ARCHITECTURE.md` + `docs/DESIGN_SYSTEM.md` + `docs/ENDPOINTS.md` + `docs/CURRENT_TASK.md` for full context

---

## 📚 Documentation Map

| Document | Purpose | When to Load |
|----------|---------|--------------|
| **`docs/ARCHITECTURE.md`** | Project structure, tech stack, patterns, admin pages | **Always** - Foundation doc |
| **`docs/DESIGN_SYSTEM.md`** | Colors (hex codes), components, spacing, typography, accessibility | **Always** - For any UI work |
| **`docs/ENDPOINTS.md`** | Complete API reference, TypeScript interfaces, curl examples | **Always** - For backend integration |
| **`docs/CURRENT_TASK.md`** | Active task tracker with checkboxes | **Always** - Current work context |
| **`docs/CHANGELOG.md`** | Session history log | Reference when needed |
| **`docs/kimi_workflow.md`** | Workflow diagram | Reference when needed |

---

## 🚀 Quick Reference

### Tech Stack
- **Framework**: Angular 18 (Standalone Components)
- **Language**: TypeScript 5.4
- **Styling**: Tailwind CSS 3.3 + SCSS
- **State**: RxJS BehaviorSubjects
- **Auth**: Keycloak OAuth2 + JWT

### Demo Credentials
| Role | Email | Password |
|------|-------|----------|
| Patient | patient@example.com | Password123! |
| Caregiver | caregiver@example.com | Password123! |
| Doctor | doctor@example.com | Password123! |
| Admin | admin@example.com | Admin123! |

### Key Files
```
src/app/
├── core/
│   ├── models/
│   │   ├── user.model.ts       # User, Patient types
│   │   ├── api.model.ts        # API DTOs, enums (GenderEnum, AutonomyLevel, etc.)
│   │   └── user-management.model.ts
│   ├── services/
│   │   ├── auth.service.ts     # Keycloak + mock auth fallback
│   │   ├── api.service.ts      # Backend API calls
│   │   ├── data.service.ts     # Mock data layer
│   │   └── user-management.service.ts
│   ├── guards/
│   │   └── auth.guard.ts       # Route protection
│   └── interceptors/
│       └── auth.interceptor.ts # JWT handling
├── modules/
│   ├── auth/login.component.ts
│   ├── landing/landing.component.ts
│   ├── patient/                # 7 components - organized by page
│   │   ├── layout/
│   │   │   └── patient-layout.component.ts
│   │   ├── dashboard/
│   │   │   └── patient-dashboard.component.ts
│   │   ├── activities/
│   │   │   └── patient-activities.component.ts
│   │   ├── medications/
│   │   │   └── patient-medications.component.ts
│   │   ├── games/
│   │   │   └── patient-games.component.ts
│   │   ├── community/
│   │   │   └── patient-community.component.ts
│   │   └── profile/
│   │       └── patient-profile.component.ts
│   ├── caregiver/              # 2 components - organized by page
│   │   ├── layout/
│   │   │   └── caregiver-layout.component.ts
│   │   └── dashboard/
│   │       └── caregiver-dashboard.component.ts
│   ├── doctor/                 # 2 components - organized by page
│   │   ├── layout/
│   │   │   └── doctor-layout.component.ts
│   │   └── dashboard/
│   │       └── doctor-dashboard.component.ts
│   └── admin/                  # 9 components - organized by page
│       ├── layout/
│       │   └── admin-layout.component.ts
│       ├── dashboard/
│       │   └── admin-dashboard.component.ts
│       ├── medical/
│       │   └── admin-medical.component.ts
│       ├── caregivers/
│       │   └── admin-caregivers.component.ts
│       ├── interactive/
│       │   └── admin-interactive.component.ts
│       ├── community/
│       │   └── admin-community.component.ts
│       ├── users/
│       │   └── admin-users.component.ts
│       ├── analytics/
│       │   └── admin-analytics.component.ts
│       └── settings/
│           └── admin-settings.component.ts
├── shared/components/
│   ├── navbar.component.ts     # Role-aware navigation with collapse
│   ├── stat-card.component.ts
│   ├── alert-card.component.ts
│   └── patient-sidebar.component.ts
└── app.routes.ts               # 17+ routes
```

---

## 🎨 Design System Quick Ref

### Colors
| Purpose | Hex | Tailwind |
|---------|-----|----------|
| Primary (Teal) | `#14b8a6` | `primary-500` |
| Success | `#10b981` | `success` |
| Warning | `#f59e0b` | `warning` |
| Danger | `#ef4444` | `danger` |
| Info | `#3b82f6` | `info` |

### Role Themes
| Role | Color |
|------|-------|
| Patient | Teal `#14b8a6` |
| Caregiver | Emerald `#10b981` |
| Doctor | Blue `#3b82f6` |
| Admin | Violet `#8b5cf6` |

---

## 🔌 Backend Integration

### Base URLs (via proxy)
```
/api → http://localhost:8080 (Gateway)
/realms → http://localhost:8090 (Keycloak)
```

### Services Status
| Service | Port | Status |
|---------|------|--------|
| Identity Service | 8001 | ✅ Implemented (Patients, Doctors, Caregivers, Autonomy) |
| Event Ingestion | 8002 | 🔴 Not Implemented |
| Safety Alert Engine | 8003 | 🔴 Not Implemented |
| Notification Service | 8004 | 🔴 Not Implemented |
| Cognitive Memory | 8005 | 🔴 Not Implemented |
| Daily Care | 8006 | 🔴 Not Implemented |
| Medical Management | 8007 | 🔴 Not Implemented |
| Care Team | 8008 | 🔴 Not Implemented |
| Community Social | 8009 | 🔴 Not Implemented |

### Key Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/patients/{keycloakId}` | GET | Get patient profile |
| `/api/v1/patients` | POST | Create patient (DOCTOR/ADMIN) |
| `/api/v1/patients/{id}/autonomy` | GET | Get autonomy assessment |
| `/realms/alzcare/protocol/openid-connect/token` | POST | Login |

---

## ⚠️ Known Issues & Areas for Improvement

1. **No Unit Tests** - 0% coverage (add Jest/Karma)
2. **No Error Handling Service** - API errors handled inconsistently
3. **No Loading/Spinner Service** - Manual loading flags in components
4. **No OnPush Change Detection** - Performance optimization needed
5. **Missing unsubscriptions** - Memory leak risk in some components
6. **No i18n** - Arabic/French planned but not implemented
7. **Admin Pages Templates Only** - 7 admin pages have mock data, need backend integration

---

## 📝 AI Workflow

**User loads:** `ARCHITECTURE.md` + `DESIGN_SYSTEM.md` + `ENDPOINTS.md` + `CURRENT_TASK.md`

**AI does:**
1. Read CURRENT_TASK.md to understand active task
2. Fill in Implementation Plan with phases/steps
3. Work through and tick boxes `[x]` as progress is made
4. At end: Update CHANGELOG.md → Clear CURRENT_TASK.md

---

## 🔗 Related Documents

- **Full Design System**: `docs/DESIGN_SYSTEM.md`
- **Architecture Details**: `docs/ARCHITECTURE.md`
- **API Reference**: `docs/ENDPOINTS.md`
- **Session History**: `docs/CHANGELOG.md`
- **Workflow Diagram**: `docs/kimi_workflow.md`

---

*Last Updated: 2026-02-14*
*Document Version: 2.1*
