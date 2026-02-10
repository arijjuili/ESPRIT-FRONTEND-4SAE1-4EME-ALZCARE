# CareHub - Architecture Overview

**Project:** Alzheimer Care Platform - Academic Project  
**Tech Stack:** Angular 18 + TypeScript + Tailwind CSS  
**Status:** ✅ Production Ready

---

## Project Structure

```
alzheimerApp/src/app/
├── core/
│   ├── models/           # TypeScript interfaces (User, Patient, etc.)
│   ├── services/         # AuthService, DataService
│   └── guards/           # AuthGuard for protected routes
├── modules/
│   ├── auth/             # Login component
│   ├── landing/          # Landing page
│   ├── patient/          # 8 components (dashboard, activities, etc.)
│   ├── caregiver/        # 2 components
│   ├── doctor/           # 2 components
│   └── admin/            # 2 components
├── shared/
│   └── components/       # Reusable: Navbar, StatCard, AlertCard
├── app.routes.ts         # Route definitions
└── app.component.ts      # Root component
```

---

## Key Statistics

| Metric | Count |
|--------|-------|
| Components | 21 |
| Routes | 15+ |
| Services | 3 (Auth, Data, Guard) |
| Models | 6 TypeScript interfaces |

---

## Tech Stack

- **Framework:** Angular 18 (Standalone Components)
- **Language:** TypeScript ~5.4
- **Styling:** Tailwind CSS 3.3
- **State:** RxJS Observables
- **Icons:** Unicode emoji

---

## Architecture Decisions

### Standalone Components
Modern Angular pattern with better tree-shaking and cleaner code.

### Service-First Approach
Mock data layer (`DataService`) ready to swap with real API without component changes.

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
- **Dashboard Backgrounds:** Each layout component defines `--role-primary-light` CSS variable, creating a subtle gradient background that matches the role theme
- **Consistency:** Both sidebar and dashboard use the same color tokens from DESIGN_SYSTEM.md

---

## Component Architecture

All components follow Angular best practices:
- Separate `.html` template files
- Separate `.scss` style files
- Clean TypeScript class files (~50 lines vs ~250 lines before)

---

## Known Issues & Fixes

### Issue #1: Invalid Angular Version (2026-02-10)
**Problem:** package.json had non-existent Angular 21 versions  
**Fix:** Downgraded to stable Angular 18 (^18.2.0)

### Issue #2: Inline Templates (2026-02-10)
**Problem:** All 21 components used inline HTML/CSS  
**Fix:** Refactored to separate template/style files (42 new files)

---

## Backend Integration Path

Current: Mock data in `DataService`  
Future: Replace with HTTP calls:

```typescript
// AuthService
login(email, password): Observable<AuthUser> {
  return this.http.post('/api/auth/login', { email, password });
}

// DataService  
getPatients(): Observable<Patient[]> {
  return this.http.get<Patient[]>('/api/patients');
}
```

---

## 🤖 Agent Instructions (For AI Assistant)

### When to Read This File
- **At the start of every session** - Understand project structure and tech stack
- **Before major changes** - Check architecture decisions
- **When adding new features** - Verify component placement (core/modules/shared)

### When to Update This File
- **New architecture decisions** - Add to "Architecture Decisions" section
- **Project structure changes** - Update folder tree
- **New known issues** - Add to "Known Issues & Fixes" with date
- **Tech stack changes** - Update versions in "Tech Stack"

### What NOT to Change
- Historical fixes in "Known Issues" (append only)
- Existing structure diagrams (update only if changed)

---

*See SETUP.md for installation and running instructions.*
