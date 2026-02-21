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
- **Auth**: Keycloak OAuth2 + JWT with Automatic Token Refresh

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
│   │   ├── user.model.ts              # User, Patient types
│   │   ├── api.model.ts               # API DTOs, Token types
│   │   ├── notification.model.ts      # Notification types
│   │   ├── notification-schedule.model.ts  # Schedule types
│   │   ├── safety-alert.model.ts      # Behavior logs, Alerts
│   │   └── user-management.model.ts   # Admin user management
│   ├── services/
│   │   ├── auth.service.ts            # Keycloak + mock auth fallback
│   │   ├── token-refresh.service.ts   # Auto JWT refresh
│   │   ├── api.service.ts             # Backend API calls
│   │   ├── data.service.ts            # Mock data layer
│   │   ├── patient.service.ts         # Patient data
│   │   ├── safety-alert.service.ts    # Behavior logs, alerts
│   │   ├── notification.service.ts    # Notifications
│   │   ├── notification-schedule.service.ts  # Schedule CRUD
│   │   └── user-management.service.ts # Admin user management
│   ├── guards/
│   │   └── auth.guard.ts              # Route protection
│   └── interceptors/
│       └── auth.interceptor.ts        # JWT handling + refresh
├── modules/
│   ├── auth/login.component.ts
│   ├── landing/landing.component.ts
│   ├── patient/                      # 7 components
│   ├── caregiver/                    # 5+ components (behaviors added)
│   ├── doctor/                       # 2 components
│   └── admin/                        # 11 components (+schedules)
├── shared/components/
│   ├── navbar.component.ts           # Role-aware navigation
│   ├── stat-card.component.ts
│   ├── alert-card.component.ts
│   ├── notification-bell/            # Unread count, dropdown
│   ├── notification-list/            # Full notification center
│   └── toast/                        # Toast notifications
└── app.routes.ts                     # 24+ routes
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
| Role | Color | CSS Variable |
|------|-------|--------------|
| Patient | Teal `#14b8a6` | `--primary-color` |
| Caregiver | Emerald `#10b981` | `--primary-color` |
| Doctor | Blue `#3b82f6` | `--primary-color` |
| Admin | Violet `#8b5cf6` | `--primary-color` |

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
| Safety Alert Engine | 8003/8082 | ✅ Implemented (Behavior logs, Alerts) |
| Notification Service | 8004 | ✅ Implemented (Notifications + Schedules) |
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
| `/api/v1/patients/{id}/autonomy` | GET/POST | Autonomy assessment |
| `/api/safety/behavior-logs/*` | ALL | Behavior tracking |
| `/api/safety/alerts/*` | ALL | Alert management |
| `/api/v1/notifications/*` | ALL | Notifications |
| `/api/v1/schedules/*` | ALL | Notification schedules (admin) |
| `/realms/alzcare/protocol/openid-connect/token` | POST | Login |

---

## ✅ Recently Implemented (See CHANGELOG.md for details)

### Session 21 (2026-02-21) - Pre-Push Code Quality Fixes
- Fixed 7 form validation issues (email, password, date ranges)
- Fixed 5 memory leaks with `takeUntil(destroy$)` pattern
- Removed 16 console.log statements from production code
- Created shared `ValidationUtils` utility class
- Enhanced admin users pagination (page size selector, page numbers)

### Session 20 (2026-02-21) - Notification Schedule Management
- Admin UI for creating/managing notification schedules
- Schedule types: INTERVAL, CRON, ONE_TIME
- Role-based targeting, template variables, multi-channel

### Session 19 (2026-02-20) - Notification Bell Integration
- Real notification service connected
- Bell in dashboard headers with dropdown
- Unread count polling

### Session 18 (2026-02-19) - Notification System
- Complete notification infrastructure
- Toast notifications, notification list page
- Bell component with dropdown

### Session 17 (2026-02-18) - Auto Token Refresh
- Automatic JWT refresh before expiry
- No more 5-minute logout issues

### Session 16-15 (2026-02-17) - Safety Alert Engine
- Behavior logging for caregivers
- Alert management (acknowledge, resolve, escalate)
- Full behavior tracking page

---

## ⚠️ Known Issues & Areas for Improvement

1. **No Unit Tests** - 0% coverage (add Jest/Karma)
2. **No Error Handling Service** - API errors handled inconsistently
3. **No Loading/Spinner Service** - Manual loading flags in components
4. **Admin Pages Partial** - Some admin pages have mock data, need full backend integration
5. **Missing unsubscriptions** - Memory leak risk in some components
6. **No i18n** - Arabic/French planned but not implemented

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

*Last Updated: 2026-02-21*
*Document Version: 3.0*
