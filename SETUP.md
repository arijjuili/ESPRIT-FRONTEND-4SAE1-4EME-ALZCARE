# CareHub - Alzheimer Care Platform Setup

## 📋 Overview
A multi-user Angular web application for comprehensive Alzheimer's care management with 4 dedicated dashboards for patients, caregivers, doctors, and administrators.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Angular CLI 17+

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Install Angular CLI globally (if not already installed):**
```bash
npm install -g @angular/cli@17
```

3. **Start the development server:**
```bash
npm start
# or
ng serve --open
```

The app will automatically open at `http://localhost:4200`

## 🔐 Demo Credentials

All demo accounts use password: **password**

| Role | Email | Notes |
|------|-------|-------|
| **Patient** | patient@example.com | View health metrics, appointments, medications |
| **Caregiver** | caregiver@example.com | Manage patient tasks, monitor health |
| **Doctor** | doctor@example.com | Patient records, prescriptions, appointments |
| **Admin** | admin@example.com | User management, system reports |

## 📁 Project Structure

```
src/app/
├── core/
│   ├── models/           # TypeScript interfaces
│   ├── services/         # Auth, Data services
│   └── guards/           # Auth guard
├── modules/
│   ├── auth/             # Login component
│   ├── landing/          # Landing page
│   ├── patient/          # Patient dashboard
│   ├── caregiver/        # Caregiver dashboard
│   ├── doctor/           # Doctor dashboard
│   └── admin/            # Admin dashboard
├── shared/
│   └── components/       # Reusable components
├── app.routes.ts         # Route definitions
└── app.component.ts      # Root component
```

## 🎨 Key Features

### Patient Dashboard
- ✅ Health metrics (blood pressure, heart rate, glucose)
- ✅ Upcoming appointments
- ✅ Current medications with dosage
- ✅ Daily activity tasks with checkbox tracking
- ✅ Health metrics history placeholder

### Caregiver Dashboard
- ✅ Patients under care with contact info
- ✅ Care tasks with priority levels
- ✅ Task completion tracking
- ✅ Patient alerts and reminders
- ✅ Activity log and care summary

### Doctor Dashboard
- ✅ Patient roster with full medical records
- ✅ Medical history and current medications
- ✅ Scheduled appointments
- ✅ Quick action buttons (View Record, Add Prescription)
- ✅ Performance statistics

### Admin Dashboard
- ✅ User management table
- ✅ System status monitoring
- ✅ User breakdown statistics
- ✅ Recent system activity logs
- ✅ Quick action buttons (Generate Report, Run Backup)

## 🛠 Architecture

### Services

**AuthService**
- Manages user authentication
- Persists user state to localStorage
- Provides authentication status stream

**DataService**
- Serves mock data (hardcoded)
- Patient information
- Appointments, medications, tasks
- Health metrics

### Components

**Shared Components**
- `NavbarComponent` - Navigation with logout
- `StatCardComponent` - Reusable metric cards
- `AlertCardComponent` - Alert notifications

**Layout Components**
- Separate layout wrapper for each role
- Navbar integration

**Dashboard Components**
- Fully responsive grid layouts
- Role-specific data and features

## 🔌 Tech Stack

- **Framework:** Angular 17 (Standalone API)
- **Language:** TypeScript 5.2
- **Styling:** Tailwind CSS 3.3
- **Icons:** Unicode emoji
- **State Management:** RxJS Observables
- **Routing:** Angular Router

## 📝 Mock Data

All data is hardcoded in `DataService`:

- **2 Patients:** Margaret Johnson, Robert Williams
- **4 Demo Users:** One for each role
- **Multiple Appointments, Tasks, Health Metrics**

To modify data, edit `src/app/core/services/data.service.ts`

## 🔄 Adding Backend

To connect to a real backend:

1. **Update AuthService:**
```typescript
login(email: string, password: string): Observable<AuthUser> {
  return this.http.post('/api/auth/login', { email, password });
}
```

2. **Update DataService:**
```typescript
getPatients(): Observable<Patient[]> {
  return this.http.get<Patient[]>('/api/patients');
}
```

3. **Add HttpClientModule to providers**

## 📱 Responsive Design

The app is fully responsive:
- Mobile: Single column layout
- Tablet: 2-column layout
- Desktop: 3-column layout with sidebar

## 🎯 Next Steps

1. **Add more patient data** → Expand mock data in DataService
2. **Implement charts** → Add Chart.js or Recharts
3. **Add forms** → Patient/medication editing
4. **Backend integration** → Replace mock services with API calls
5. **Testing** → Add unit and E2E tests
6. **Authentication** → Implement JWT-based auth with real backend
7. **Real-time updates** → Integrate WebSocket for live alerts

## 🐛 Troubleshooting

**Port 4200 already in use:**
```bash
ng serve --port 4201
```

**Tailwind not working:**
Make sure `src/styles.css` is loaded and contains `@tailwind` directives.

**TypeScript errors:**
```bash
npm install
npm start
```

## 📄 License

Academic Project - CareHub 2026

---

**Questions?** Check the demo credentials and explore each role's dashboard to understand the features!
