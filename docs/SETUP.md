# CareHub - Setup Guide

## Quick Start

```bash
npm install
npm start
```

App opens at `http://localhost:4200`

---

## Demo Credentials

Password for all: `password`

| Role | Email | Purpose |
|------|-------|---------|
| Patient | patient@example.com | Health metrics, appointments |
| Caregiver | caregiver@example.com | Patient tasks, monitoring |
| Doctor | doctor@example.com | Medical records |
| Admin | admin@example.com | User management |

---

## Tech Stack

- Angular 18 (Standalone Components)
- TypeScript ~5.4
- Tailwind CSS 3.3
- RxJS

---

## Project Structure

```
src/app/
├── core/           # Models, Services, Guards
├── modules/        # Feature modules (auth, patient, etc.)
├── shared/         # Reusable components
└── app.routes.ts   # Routing config
```

---

## Troubleshooting

**Port 4200 in use:**
```bash
ng serve --port 4201
```

**Angular version errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build errors:** Check `ARCHITECTURE.md` → Known Issues

---

## Backend Integration

Replace mock services in `core/services/`:

```typescript
// Example: DataService
getPatients(): Observable<Patient[]> {
  return this.http.get<Patient[]>('/api/patients');
}
```

---

## 🤖 Agent Instructions (For AI Assistant)

### When to Read This File
- **At the start of every session** - Get quick project overview and credentials
- **When user asks "how to run"** - Reference Quick Start section
- **When troubleshooting** - Check "Troubleshooting" section

### When to Update This File
- **New dependencies** - Update "Tech Stack" section
- **New build/run issues** - Add to "Troubleshooting" with solution
- **Demo credentials change** - Update credentials table
- **Project structure changes** - Update structure diagram

### What NOT to Change
- Working troubleshooting solutions (append new ones)
- Demo credentials unless explicitly changed in auth service

---

*See ARCHITECTURE.md for technical details.*
*See CHANGELOG.md for development history.*
