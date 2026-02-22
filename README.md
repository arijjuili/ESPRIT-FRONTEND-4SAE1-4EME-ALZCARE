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
- **Dashboard**: Overview of assigned patients and key metrics
  - Quick access "Log Behavior" button with patient pre-selection
- **Behavior Tracking**: Log and monitor patient behaviors and incidents
  - Behavior log form with **image upload** (drag-drop, gallery, camera)
  - Behavior log list for reviewing history with photo thumbnails
  - Full-screen lightbox/slideshow for viewing attached images
  - Keyboard navigation (arrows, escape) in lightbox
  - Patient-specific behavior tracking

### Doctor Dashboard
- **Dashboard**: Overview of patient cases *(Other features: Patient Records, Schedule Management - Not Implemented)*

### Admin Dashboard
- **Dashboard**: System overview and key metrics
- **Medical Records**: Access and manage medical records
- **Caregivers Management**: Manage caregiver accounts
- **Interactive Features**: Interactive tools and features
- **Community Management**: Moderate community content
- **User Management**: Manage system users and roles
- **Analytics**: Monitor system-wide metrics
- **Settings**: System configuration
- **Schedule Management**: Create and manage notification schedules

### Shared Features
- **Notification System**: Real-time notifications with polling
  - Notification bell in navbar
  - Notification list page
  - Toast notifications
- **Safety Alerts**: Safety alert management system
- **Landing Page**: Public landing page for the application

## 🛠️ Tech Stack

- **Frontend**: Angular 18+ (Standalone Components)
- **Styling**: Tailwind CSS
- **Language**: TypeScript
- **Reactive Programming**: RxJS
- **Authentication**: Keycloak OAuth2
- **Build Tool**: Angular CLI
- **Version Control**: Git

## 🔧 Backend Services

| Service | Port | Status |
|---------|------|--------|
| Identity Service | 8001 | ✅ Active |
| Safety Alert Engine | 8003 | ✅ Active |
| Notification Service | 8004 | ✅ Active |

## 📦 Project Structure

```
src/
├── app/
│   ├── core/              # Services, guards, interceptors, models
│   │   ├── guards/        # Auth guards
│   │   ├── interceptors/  # HTTP interceptors (auth)
│   │   ├── models/        # Data models (user, notification, safety-alert, etc.)
│   │   └── services/      # Core services (auth, api, notification, etc.)
│   ├── modules/           # Feature modules
│   │   ├── auth/          # Login component
│   │   ├── landing/       # Landing page
│   │   ├── patient/       # Patient dashboard, activities, medications, games, community, profile
│   │   ├── caregiver/     # Caregiver dashboard, behavior tracking
│   │   ├── doctor/        # Doctor dashboard *(limited features)*
│   │   └── admin/         # Admin dashboard, medical, users, schedules, settings, etc.
│   ├── shared/            # Shared components
│   │   └── components/    # Navbar, sidebars, cards, notifications, toast, etc.
│   ├── app.component.*    # Root component
│   └── app.routes.ts      # Main routing configuration
├── assets/                # Images, icons, static files
├── environments/          # Environment configurations
└── styles.css             # Global styles and Tailwind imports
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

The app supports role-based access control with **automatic token refresh** (no more 5-minute logout interruptions):
- **Patient**: View own health data and activities
- **Caregiver**: Manage assigned patients, track behaviors
- **Doctor**: Access dashboard *(full medical records - Not Implemented)*
- **Admin**: System administration and user management

Authentication is handled via Keycloak OAuth2 with silent token refresh for seamless user experience.

## 📝 Latest Updates

### Session 23: 2026-02-22
- ✅ **Cloudinary Image Upload** - Direct image uploads for behavior logging
  - Drag & drop file upload
  - Gallery selection (up to 5 images)
  - Camera capture on mobile devices
  - Full-screen lightbox viewer with slideshow navigation
  - Image thumbnails in behavior lists
  - Quick access behavior log fix (caregiver dashboard)

### Session 22: 2026-02-22
- ✅ Behavior log form fixes (reportedBy field, severity slider)

### Session 21: 2026-02-21
- ✅ Pre-push code quality fixes (validation, memory leaks, console logs)

### Session 20: 2026-02-21
- ✅ Notification Schedule Management - Admin UI for creating/managing scheduled notification campaigns

### Session 19: 2026-02-20
- ✅ Notification Bell Positioning & Real Service Integration

### Session 18: 2026-02-19
- ✅ Complete Frontend Notification System with toast, bell, list

### Session 17: 2026-02-18
- ✅ Automatic Token Refresh Implementation (no more 5-min logout)

### Session 16: 2026-02-17
- ✅ Behavior Severity Display & Filter Fix

### Session 15: 2026-02-17
- ✅ Caregiver Behaviors Page with filtering/sorting

### Session 2: 2026-02-07
- ✅ Fixed NG5002 & TS2769 parser errors
- ✅ Refactored navbar with collapsible sidebar
- ✅ Made dashboards fully mobile-responsive
- ✅ Unified sidebar for all user roles
- ✅ Fixed desktop layout issues (sidebar overlay)

### Recent Additions
- ✅ Notification system with real-time polling
- ✅ Safety alert management
- ✅ Schedule management (Admin)
- ✅ Behavior tracking for caregivers
- ✅ Landing page

See `progress.md` for detailed changelog.

## 📋 Feature Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Patient Dashboard | ✅ Complete | All features implemented |
| Patient Activities | ✅ Complete | |
| Patient Medications | ✅ Complete | |
| Patient Games | ✅ Complete | |
| Patient Community | ✅ Complete | |
| Patient Profile | ✅ Complete | |
| Caregiver Dashboard | ✅ Complete | |
| Caregiver Behavior Tracking | ✅ Complete | Log, list, patient-specific views |
| Caregiver Task Management | ⏳ Planned | Not implemented |
| Caregiver Care Schedule | ⏳ Planned | Not implemented |
| Doctor Dashboard | ✅ Complete | |
| Doctor Patient Records | ⏳ Planned | Not implemented |
| Doctor Schedule Management | ⏳ Planned | Not implemented |
| Admin Dashboard | ✅ Complete | |
| Admin Medical Records | ✅ Complete | |
| Admin User Management | ✅ Complete | |
| Admin Schedule Management | ✅ Complete | Create/edit notification schedules |
| Admin Analytics | ✅ Complete | |
| Admin Settings | ✅ Complete | |
| Notification System | ✅ Complete | Polling, bell, list, toasts |
| Safety Alert System | ✅ Complete | |
| Landing Page | ✅ Complete | |

## 🤝 Contributing

This is an educational project. Contributions and suggestions are welcome!

## 📄 License

MIT License - feel free to use this project for learning and development.

## 👨‍💻 Author

**Iheb** - Software Engineering Student

---

Built with ❤️ for caring for those who need it most.
