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
│   ├── modules/           # Feature modules (patient, caregiver, doctor, admin)
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

## 📝 Latest Updates

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
