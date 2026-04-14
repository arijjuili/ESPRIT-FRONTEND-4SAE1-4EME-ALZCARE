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
│   ├── services/         # AuthService, TokenRefreshService, ApiService, DataService, UserManagementService
│   ├── guards/           # AuthGuard for protected routes
│   └── interceptors/     # AuthInterceptor for JWT handling
├── modules/
│   ├── auth/             # Login component
│   ├── landing/          # Landing page
│   ├── patient/          # 8 components organized by page folder
│   │   ├── layout/
│   │   ├── dashboard/
│   │   ├── activities/
│   │   ├── medications/
│   │   ├── games/
│   │   ├── community/    # NEW: Community forum with post detail
│   │   │   ├── post-detail/
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
│       ├── settings/
│       └── schedules/    # Notification schedule management
│           ├── schedule-list/
│           └── schedule-form/
├── shared/
│   └── components/       # Reusable: Navbar, StatCard, AlertCard, PatientSidebar, NotificationBell, NotificationList, Toast
├── app.routes.ts         # Route definitions
└── app.component.ts      # Root component
```

---

## Key Statistics

| Metric | Count |
|--------|-------|
| Total Components | 43+ |
| Admin Dashboard Pages | 9 (Medical, Caregivers, Interactive, Community, Users, Analytics, Settings, Schedules) |
| Patient Pages | 8 (Dashboard, Activities, Medications, Games, Community, Community Detail, Profile, Redesign) |
| Caregiver Pages | 5 (Dashboard, Behaviors, Tasks, Handovers, Patients) |
| Doctor Pages | 3 (Dashboard, Patient Detail, Checklist) |
| Routes | 30+ |
| Profile Types | 4 (Patient, Doctor, Caregiver, Admin) |
| Services | 13 (Auth, TokenRefresh, Api, Data, UserManagement, **SafetyAlert**, Patient, CareTeam, Notification, NotificationSchedule, Toast, Community, **CameraDevice**) |
| Guards/Interceptors | 2 (AuthGuard, AuthInterceptor) |
| Models | 20+ TypeScript interfaces |
| Utilities | 1 (ValidationUtils) |

---

## Tech Stack

- **Framework:** Angular 18 (Standalone Components)
- **Language:** TypeScript ~5.4
- **Styling:** Tailwind CSS 3.3 + SCSS
- **State:** RxJS BehaviorSubjects (Auth, Data services)
- **Icons:** Unicode emoji
- **Auth:** Keycloak OAuth2 + JWT with Automatic Token Refresh

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

### Patient Module (8 Components)
| Component | Purpose |
|-----------|---------|
| `patient-layout` | Layout wrapper with role-themed sidebar |
| `patient-dashboard` | Main dashboard with health metrics, appointments, medications |
| `patient-activities` | Daily tasks and activity tracking |
| `patient-medications` | Medication schedule and management |
| `patient-games` | Cognitive games hub (6 brain games) |
| `patient-community` | Community forum with discussion threads and support groups |
| `post-detail` | Detailed post view with comments and interactions |
| `patient-profile` | Personal info, settings, preferences |

### Community/Forum Module (2 Components)
This module provides social features for patients to connect, share experiences, and support each other through discussion threads and comments.

| Component | Purpose |
|-----------|---------|
| `patient-community` | Main community feed displaying discussion posts in a card layout with categories, like counts, and comment previews |
| `post-detail` | Detailed post view showing full post content, comment thread with nested replies, like functionality, and comment creation form |

**Models:**
- `Post` - Discussion posts with title, content, category, author, timestamps
- `Comment` - Threaded comments with user attribution
- `DiscussionCategory` - Enum for post categories (ADVICE, SUPPORT, RESOURCES, SUCCESS_STORIES, QUESTIONS)
- `CreatePostRequest`, `CreateCommentRequest` - DTOs for creating content
- `PaginatedPosts` - Pagination wrapper for post lists

**Services:**
- `CommunityService` - Handles CRUD operations for posts and comments, manages community interactions and API communication with community-social service (port 8009)

### Admin Module (12 Components)
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
| `schedule-list` | View/manage notification schedules | `/admin/schedules` |
| `schedule-form` | Create/edit notification schedules | `/admin/schedules/new`, `/admin/schedules/edit/:id` |
| `admin-camera-devices` | Camera pairing & management | `/admin/medical/cameras` |
| `admin-camera-provisioning` | **NEW:** Generate pairing tokens for ESP32-CAM | `/admin/medical/camera-provisioning` |

**Camera Device Management:**
- Pair ESP32 cameras to patients by MAC address
- Configure zones (BEDROOM, HALLWAY, BATHROOM, etc.)
- Monitor camera status (ACTIVE, PAUSED, OFFLINE)
- Unpair cameras with confirmation

**Services:**
- `CameraDeviceService` - API integration with event-ingestion service (port 8002), pairing token management

### Caregiver Module (5 Components)
| Component | Purpose | Route |
|-----------|---------|-------|
| `caregiver-layout` | Layout wrapper | - |
| `caregiver-dashboard` | Patient list, care tasks, schedules | `/caregiver/dashboard` |
| `behaviors-page` | Full behavior tracking with filters | `/caregiver/behaviors`, `/caregiver/behaviors/:patientId` |
| `behavior-log-form` | Log manual behavior incidents | Modal/Inline |
| `behavior-log-list` | Display patient behavior history with filtering | `/caregiver/behaviors/:patientId` |

**Services:**
- `CareTeamService` - Caregiver assignments, patient access control, handover notes
- `PatientService` - Patient profile data (filtered to assigned patients only)
- `SafetyAlertService` - Behavior logging and alerts for assigned patients

### Doctor Module (2 Components)
| Component | Purpose |
|-----------|---------|
| `doctor-layout` | Layout wrapper |
| `doctor-dashboard` | Medical records, patient prescriptions |

### Safety & Behavior Tracking Module (5 Components)
| Component | Purpose | Route |
|-----------|---------|-------|
| `behavior-log-form` | Form for logging manual behaviors (modal/page) | `/caregiver/behaviors/:patientId` |
| `behavior-log-list` | Display patient behavior history with filtering | `/caregiver/behaviors/:patientId` |
| `behaviors-page` | Parent page combining form and list with **validation workflow** | `/caregiver/behaviors`, `/caregiver/behaviors/:patientId` |
| `behavior-detail-modal` | View behavior details + **validation actions** | Modal |
| `alert-card` | Alert display component | Shared |

**Features:**
- **Manual Behavior Logging:** Caregivers report incidents (falls, agitation, etc.)
- **Auto-Detected Events:** Camera-detected behaviors (wandering, night motion)
- **Validation Workflow:** 
  - ⏳ **Pending Validation** badge for auto-detected behaviors
  - ✅ **Confirm** - Validate as real incident with notes
  - ❌ **False Alarm** - Mark as false positive with explanation
  - Modal dialog for entering validation notes
- **Status Tracking:** Confirmed/False Alarm badges after validation

**Services:**
- `SafetyAlertService` - Create manual logs, get patient behaviors, **validate behaviors**, alerts management
- `PatientService` - Patient profile data for behavior tracking
- `CareTeamService` - Patient access control via caregiver assignments

### Auth Module (1 Component)
| Component | Purpose |
|-----------|---------|
| `login` | Keycloak OAuth2 login with mock fallback |

### Landing Module (1 Component)
| Component | Purpose |
|-----------|---------|
| `landing` | Public landing page with CTA |

### Shared Components (8 Components)
| Component | Purpose |
|-----------|---------|
| `navbar` | Role-aware sidebar navigation with collapse |
| `stat-card` | Reusable stat display card |
| `alert-card` | Notification/alert display |
| `patient-sidebar` | Patient-specific sidebar variant |
| `notification-bell` | Bell icon with dropdown for recent notifications |
| `notification-list` | Full notification center with filters |
| `toast-container` | Global toast notification container |
| `image-upload` | Cloudinary image upload with drag-drop, camera, gallery |

### Notification System Components (4 Components)
| Component | Purpose | Location |
|-----------|---------|----------|
| `notification-bell` | Bell icon with unread badge and dropdown | Dashboard headers (top-right) |
| `notification-list` | Full notification center page with filters, search, pagination | `/notifications` route |
| `toast-container` | Fixed position toast notifications | App root |
| `toast` | Individual toast notification item | Used by toast-container |

**Services:**
- `NotificationService` - HTTP methods, polling for real-time updates, state management via BehaviorSubject
- `ToastService` - Global toast notification service (success, error, warning, info, emergency)

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
| Safety Alert Engine | 8082 | `/api/safety` | ✅ Implemented |
| Notification Service | 8004 | `/api/v1/notifications` | ✅ Implemented |
| Notification Schedules | 8004 | `/api/v1/schedules` | ✅ Implemented |
| Gateway Service | 8080 | `/api` | ✅ Implemented |
| Keycloak Auth | 8090 | `/realms` | ✅ Implemented |
| Cognitive Memory | 8005 | `/api/v1/cognitive` | 🔴 Not Implemented |
| Daily Care | 8006 | `/api/v1/daily-care` | 🔴 Not Implemented |
| Medical Management | 8007 | `/api/v1/medical` | 🔴 Not Implemented |
| Care Team | 8008 | `/api/v1/care-team` | ✅ Implemented |
| Community Social | 8009 | `/api/v1/community` | ✅ Complete |

---

## Known Issues & Fixes

### Issue #1: Invalid Angular Version (2026-02-10)
**Problem:** package.json had non-existent Angular 21 versions  
**Fix:** Downgraded to stable Angular 18 (^18.2.0)

### Issue #2: Inline Templates (2026-02-10)
**Problem:** All components used inline HTML/CSS  
**Fix:** Refactored to separate template/style files (42+ new files)

### Issue #3: BehaviorSeverity Enum Mismatch (2026-02-17)
**Problem:** Backend sends severity as enum strings (`ONE`, `TWO`, etc.) but frontend expected numbers. Display showed "FOUR/5" and filters didn't work.  
**Fix:** Added `BehaviorSeverity` type, `severityToNumber()` helper, and conversion in service layer. Now displays "4/5" and filters correctly.

### Issue #4: 5-Minute Auto-Logout (2026-02-18)
**Problem:** Access tokens expired after 5 minutes and users were immediately logged out. The refresh token was stored but never used.  
**Fix:** Implemented automatic token refresh system with `TokenRefreshService` and updated `AuthInterceptor`. Now tokens are refreshed proactively (when < 60s remaining) or reactively (on 401), with request queueing during refresh.

### Issue #5: Notification Schedule Management Missing (2026-02-21)
**Problem:** Backend had fully implemented Dynamic Notification Scheduler but frontend had no UI to manage schedules.  
**Fix:** Created complete schedule management system with models, service, list component, form component, routing, and navigation. Admins can now create, edit, delete, toggle, and manually trigger notification schedules from the UI.

### Issue #6: Token Refresh Implementation (2026-02-18)
**Problem:** Access tokens expired after 5 minutes causing immediate logout. The refresh token was stored but never used.  
**Fix:** Implemented `TokenRefreshService` with automatic token refresh (proactive when < 60s remaining, reactive on 401), request queueing via BehaviorSubject, and updated `AuthInterceptor` to handle the refresh lifecycle.

### Issue #7: Notification System Implementation (2026-02-21)
**Problem:** Frontend lacked a complete notification system for real-time user alerts.  
**Fix:** Built comprehensive notification system with:
- `NotificationBellComponent` - Dropdown with recent notifications, unread badge
- `NotificationListComponent` - Full page with filters (ALL, UNREAD, ALERTS, REMINDERS, SYSTEM), search, infinite scroll
- `NotificationService` - HTTP client with 30-second polling for real-time updates
- `ToastService` - Global toast notifications (success, error, warning, info, emergency types)

### Issue #8: Memory Leaks in Multiple Components (2026-02-21)
**Problem:** Multiple components had subscription leaks causing memory issues: `behaviors-page.component.ts`, `caregiver-dashboard.component.ts`, `admin-users.component.ts`  
**Fix:** Implemented `takeUntil(destroy$)` pattern for proper subscription cleanup. All components now implement `OnDestroy` and clean up subscriptions when destroyed.

### Issue #9: Missing Form Validation (2026-02-21)
**Problem:** Login form, user creation form, and schedule form lacked proper validation (email format, password complexity, date ranges, etc.)  
**Fix:** 
- Created shared `ValidationUtils` class in `core/utils/validation.utils.ts`
- Added email, password, username validation
- Added date range validation (end date must be after start)
- Added cron expression format validation
- All forms now show user-friendly validation messages

### Issue #10: Console Log Statements in Production Code (2026-02-21)
**Problem:** 16+ `console.log` and `console.error` statements in production code across multiple services and components.  
**Fix:** Removed all console statements from `auth.service.ts`, `login.component.ts`, `schedule-list.component.ts`, and `behavior-log-form.component.ts`. Replaced with proper error handling and toast notifications.

### Issue #11: Image Upload for Behavior Logs (2026-02-22)
**Problem:** Caregivers could only paste image URLs when logging behavior incidents. No direct upload capability existed, making it difficult to attach photos taken at the scene.  
**Fix:** Implemented Cloudinary unsigned uploads with reusable `ImageUploadComponent`. Features include: drag-drop upload, camera capture, gallery selection, progress tracking, thumbnail previews, and full-screen lightbox gallery with keyboard navigation.

### Issue #12: Behavior Log Edit/Delete (2026-02-28)
**Problem:** Caregivers could not edit or delete behavior logs after creation, even if mistakes were made during data entry. Only creation was supported.

**Solution:** Added full CRUD support for manual behavior logs:
- Edit mode in `BehaviorLogFormComponent` with pre-filled data
- Update API integration via `SafetyAlertService.updateBehaviorLog()`
- Delete with confirmation dialog via `SafetyAlertService.deleteBehaviorLog()`
- Only `MANUAL` source logs can be edited/deleted (auto-detected events are read-only)
- Hidden log ID from UI for cleaner appearance

**Files Modified:**
- `safety-alert.service.ts` - Added `updateBehaviorLog()` and `deleteBehaviorLog()` methods
- `safety-alert.model.ts` - Added `UpdateBehaviorLogRequest` interface
- `behavior-log-form.component.ts/.html` - Edit mode support with dynamic titles
- `behavior-log-list.component.ts/.html` - Edit/delete buttons with confirmation dialog
- `behaviors-page.component.ts/.html` - Parent handlers for edit/delete events

### Issue #13: Behavior Log Pagination (2026-02-28)
**Problem:** The behaviors page showed all logs at once, making it slow and hard to navigate when there were many incidents.

**Solution:** Implemented full pagination with page size selector and navigation controls.

**Features:**
- Page size selector (5, 10, 25, 50, 100 items per page)
- Smart page numbers (max 5 visible with ellipsis)
- First/Previous/Next/Last navigation buttons
- Shows range info ("Showing 1-10 of 45 behaviors")
- Resets to page 1 when filters change

### Issue #14: Modal Scroll Improvements (2026-02-28)
**Problem:** Modals used default browser scrollbars which looked unprofessional and lacked polish.

**Solution:** Added custom scrollbar styling and modal animations to `styles.css`.

**Features:**
- Custom scrollbar (8px width, rounded, hover effects)
- Modal animations (fade-in, scale-in)
- Fixed header/footer with scrollable content area
- Consistent styling across all modals

### Issue #15: Timeline View for Behaviors (2026-02-28)
**Problem:** The table view made it difficult to visualize the chronological progression of behavior incidents and identify patterns over time.

**Solution:** Added a visual timeline view as an alternative to the table view.

**Features:**
- Toggle between Table and Timeline views
- Behaviors grouped by date with smart labels (Today, Yesterday, date)
- Visual timeline with color-coded severity dots
- Connector lines between incidents
- Rich cards showing all behavior details
- Full feature parity (filters, edit/delete, detail modal)
- Responsive design for mobile devices

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

*Last Updated: 2026-03-02 (Session: Community/Forum Integration Complete)*
