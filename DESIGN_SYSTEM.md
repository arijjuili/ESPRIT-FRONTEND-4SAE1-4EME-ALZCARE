# Design System - CareHub

## Color Palette

### Healthcare-Focused Color Scheme

Our palette uses **Teal as primary** (calm, trustworthy, medical) with complementary **Rose accent** (care, warmth).

### Primary Colors

| Color | Hex | Use Case |
|-------|-----|----------|
| **Teal 500** | `#14b8a6` | Primary CTAs, navigation, active states |
| **Teal 600** | `#0d9488` | Hover states, darker accents |
| **Teal 700** | `#0f766e` | Dark backgrounds, strong emphasis |

### Semantic Colors

| Color | RGB | Use Case |
|-------|-----|----------|
| **Success** | `#10b981` | Confirmations, completed tasks, active status |
| **Warning** | `#f59e0b` | Alerts, caution, pending items |
| **Danger** | `#ef4444` | Critical alerts, high priority, errors |
| **Info** | `#3b82f6` | Information, doctor role, general info |

### Why This Palette?

1. **Teal Primary**: Commonly used in healthcare for its calming and trustworthy properties
2. **Green/Success**: Universal for positive actions (task completion, active users)
3. **Amber/Warning**: Attention without alarm (pending items, caution)
4. **Red/Danger**: Critical alerts and high-priority items
5. **Blue/Info**: Doctor-specific, professional, informational

## Color Usage by Role

### Patient Dashboard
- **Primary Teal**: Health overview, metrics
- **Green Success**: Completed activities
- **Red Danger**: Blood pressure, high-priority alerts
- **Amber Warning**: Pending tasks
- **Blue Info**: Appointment reminders

### Caregiver Dashboard
- **Primary Teal**: Patient list, main navigation
- **Green Success**: Completed tasks, active patients
- **Red Danger**: High-priority tasks
- **Amber Warning**: Medium-priority tasks
- **Blue Info**: Patient information

### Doctor Dashboard
- **Primary Teal**: Patient overview, navigation
- **Blue Info**: Patient condition, medical info
- **Green Success**: Completed prescriptions
- **Amber Warning**: Pending reviews
- **Red Danger**: Critical findings

### Admin Dashboard
- **Primary Teal**: User list, main navigation
- **Green Success**: Active sessions
- **Blue Info**: System status
- **Amber Warning**: Storage alerts
- **Red Danger**: System errors

## Components

### Stat Cards
- **Border-left**: Color-coded by metric type
- **Large value**: Bold, dark text
- **Label**: Small caps, subtle gray
- **Hover effect**: Shadow increase

### Alert Cards
- **Background**: 5% opacity of color
- **Border**: 20% opacity of color
- **Text**: Full-color text
- **Icons**: Semantic (ℹ️ info, ⚠️ warning, 🚨 danger, ✅ success)

### Buttons
- **Primary**: Teal gradient (primary-600 → primary-700)
- **Success**: Solid green
- **Info**: Solid blue
- **Danger**: Solid red
- **Hover**: Increased opacity or darker shade
- **Disabled**: Reduced opacity (50%)

### Badges/Tags
- **Role**: 20% opacity background with full-color text
- **Status**: Outlined, semi-transparent
- **Priority**: Color-coded (red = high, amber = medium, green = low)

## Typography

- **Font**: System font stack (Inter, system-ui, sans-serif)
- **Headings**: Bold, dark gray (#111827)
- **Body text**: Regular, medium gray (#374151)
- **Labels**: Small caps, light gray (#6b7280)
- **Monospace**: For technical data (emails, IDs, etc.)

## Spacing & Radius

- **Border Radius**: 
  - Cards/containers: 12px (rounded-xl)
  - Buttons/pills: 8px (rounded-lg)
  - Full circle: 50% (rounded-full)

- **Spacing**:
  - Gap between sections: 24px (py-24)
  - Gap between cards: 24px (gap-8 → 2rem)
  - Padding inside cards: 24px (p-6)
  - Component spacing: 16px (gap-4)

## Shadows

- **Subtle**: Small elements (stat cards)
- **Medium**: Cards, modals
- **Large**: Hero sections, overlays

## Responsive Breakpoints

- **Mobile**: Single column, full width
- **Tablet** (768px): 2-column layout
- **Desktop** (1024px): 3-column + sidebar

## Accessibility

- **Color contrast**: WCAG AA compliant (4.5:1 minimum)
- **Focus states**: Visible ring around interactive elements
- **Icons**: Paired with text labels
- **Spacing**: Generous touch targets (min 44px)

## Dark Mode Consideration

Current design is **light-mode only** but can be extended:
- Invert base: Dark background (#0f172a)
- Adjust text: Light gray/white
- Reduce opacity for overlays
- Keep color semantics the same

---

**All components use this system. To customize, update `tailwind.config.js` colors and regenerate.**
