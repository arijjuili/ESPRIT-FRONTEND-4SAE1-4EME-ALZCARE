# 🩺 Prescription Flow - Active Plan Management

This document describes the implementation of the prescription flow with active medication plan verification.

---

## 📋 Overview

When a doctor clicks the **"Prescribe"** button for a patient, the system automatically checks if an **active Medication Plan** already exists. Depending on the result, two behaviors are possible:

### Scenario 1: No active plan
→ Direct navigation to the new plan creation page.

### Scenario 2: Active plan exists
→ Display of a **professional modal** offering 3 options:

1. **✏️ Adjust Plan** - Modify the current plan parameters
2. **➕ Add Medication** - Add a medication to the existing plan
3. **🔄 Replace Treatment** - Create a new plan (the old one will be stopped)

---

## 🏗️ Architecture

### Created/Modified Files

```
src/
├── app/
│   ├── core/
│   │   └── services/
│   │       └── prescription-helper.service.ts      # ← NEW
│   ├── shared/
│   │   └── components/
│   │       └── active-plan-modal/
│   │           ├── active-plan-modal.component.ts   # ← NEW
│   │           ├── active-plan-modal.component.html # ← NEW
│   │           ├── active-plan-modal.component.scss # ← NEW
│   │           └── index.ts                         # ← NEW
│   └── modules/
│       └── doctor/
│           ├── patients/
│           │   └── doctor-patients.component.ts     # ← MODIFIED
│           └── prescriptions/
│               └── doctor-prescriptions.component.ts # ← MODIFIED
```

---

## 🔧 Components

### 1. PrescriptionHelperService

**Path:** `src/app/core/services/prescription-helper.service.ts`

Central service that orchestrates the prescription flow.

#### Main methods:

| Method | Description |
|--------|-------------|
| `checkActivePlan(patientId)` | Checks if an active plan exists for the patient |
| `handlePrescribeFlow(patientId, openModalFn)` | Complete flow orchestration |

#### Usage example:

```typescript
await this.prescriptionHelper.handlePrescribeFlow(
  patientId,
  (plan, patientId) => this.openActivePlanModal(plan, patientId)
);
```

---

### 2. ActivePlanModalComponent

**Path:** `src/app/shared/components/active-plan-modal/`

Professional modal displayed when an active plan exists.

#### Inputs:

| Input | Type | Description |
|-------|------|-------------|
| `activePlan` | `MedicationPlan` | The active plan to display |
| `patientId` | `string` | Patient ID |
| `patientName` | `string` (optional) | Patient name |

#### Outputs:

| Output | Type | Description |
|--------|------|-------------|
| `actionSelected` | `EventEmitter<ModalResult>` | Action chosen by the doctor |
| `closed` | `EventEmitter<void>` | Closed without action |

#### Possible actions:

```typescript
type PrescriptionAction = 
  | 'ADJUST_CURRENT'      // Adjust the current plan
  | 'ADD_MEDICATION'      // Add a medication
  | 'REPLACE_TREATMENT'   // Replace the treatment
  | 'CANCEL';             // Cancel
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Doctor clicks "Prescribe"                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. DoctorPatientsComponent.onPrescribeClick()                  │
│     → Calls PrescriptionHelperService.handlePrescribeFlow()     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Active plan verification                                    │
│     → GET /medications/plans?patientId={id}                      │
│     → Filter on status === 'ACTIVE'                             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌─────────────────────────┐     ┌───────────────────────────────┐
│  4a. No active plan     │     │  4b. Active plan found        │
│     → Direct navigation │     │     → ActivePlanModalComponent│
│       to creation       │     │       is displayed            │
└─────────────────────────┘     └───────────────────────────────┘
                                              │
                              ┌───────────────┼───────────────┐
                              │               │               │
                              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│ Adjust Plan     │ │ Add Medication  │ │ Replace Treatment       │
│ action=edit     │ │ action=add-med  │ │ action=replace          │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

---

## 🚀 Integration in a Component

### Step 1: Import dependencies

```typescript
import { PrescriptionHelperService } from '../../../core/services/prescription-helper.service';
import { ActivePlanModalComponent } from '../../../shared/components/active-plan-modal';
```

### Step 2: Add the service and component

```typescript
@Component({
  standalone: true,
  imports: [ActivePlanModalComponent, /* ... other imports */],
  // ...
})
export class MyComponent {
  private prescriptionHelper = inject(PrescriptionHelperService);
  
  // Modal state
  showActivePlanModal = false;
  activePlanForModal: MedicationPlan | null = null;
  private modalResolve: ((value: PrescriptionAction) => void) | null = null;
}
```

### Step 3: Implement the click handler method

```typescript
async onPrescribeClick(patient: PatientListItem): Promise<void> {
  await this.prescriptionHelper.handlePrescribeFlow(
    patient.id,
    (plan, patientId) => this.openActivePlanModal(plan, patientId)
  );
}
```

### Step 4: Open the modal

```typescript
private openActivePlanModal(plan: MedicationPlan, patientId: string): Promise<PrescriptionAction> {
  return new Promise((resolve) => {
    this.activePlanForModal = plan;
    this.modalResolve = resolve;
    this.showActivePlanModal = true;
  });
}
```

### Step 5: Handle modal events

```typescript
onModalActionSelected(result: ModalResult): void {
  this.showActivePlanModal = false;
  if (this.modalResolve) {
    this.modalResolve(result.action);
    this.modalResolve = null;
  }
  this.activePlanForModal = null;
}

onModalClosed(): void {
  this.showActivePlanModal = false;
  if (this.modalResolve) {
    this.modalResolve('CANCEL');
    this.modalResolve = null;
  }
  this.activePlanForModal = null;
}
```

### Step 6: Add the modal to the template

```html
<app-active-plan-modal
  *ngIf="showActivePlanModal && activePlanForModal"
  [activePlan]="activePlanForModal"
  [patientId]="activePlanPatientId"
  (actionSelected)="onModalActionSelected($event)"
  (closed)="onModalClosed()">
</app-active-plan-modal>
```

---

## 📍 Navigation and Query Params

When an action is selected, navigation uses **query parameters**:

| Action | Query Params | Behavior |
|--------|--------------|----------|
| Adjust | `?action=edit&planId=123` | Opens the plan in edit mode |
| Add medication | `?action=add-medication&planId=123` | Opens the add medication modal |
| Replace | `?action=replace` | Opens creation with note |

The `DoctorPrescriptionsComponent` handles these params in `handleRouteQueryParams()`.

---

## 🎨 Customization

### Modify modal styles

Styles are defined in:
```
src/app/shared/components/active-plan-modal/active-plan-modal.component.scss
```

Main variables:
- `$primary-color` : Primary color (blue)
- `$success-color` : Green for positive actions
- `$warning-color` : Orange for warnings
- `$danger-color` : Red for destructive actions

### Modify modal content

The template is in:
```
src/app/shared/components/active-plan-modal/active-plan-modal.component.html
```

---

## 🧪 Testing

### Manual test

1. Go to the patient list (`/doctor/patients`)
2. Click "Prescribe" for a patient **without** an active plan
   → Verify direct navigation to creation
3. Create a plan for this patient
4. Return to the list and click "Prescribe" again
   → Verify the modal displays with plan information
5. Test each modal option

### Log verification

Actions are logged in the console:
```
Prescribe clicked for patient: 123
Active plan found: { ... }
Action: Adjust current plan 456
```

---

## 🔮 Future Extensions

The following points are planned for upcoming iterations:

1. **Complete business logic**
   - Real implementation of `ADJUST_CURRENT`
   - Validation of modifications
   - Automatic saving

2. **Replacement management**
   - Automatic stopping of the old plan
   - Copying medications if desired
   - Replacement history

3. **UX improvements**
   - Transition animations
   - Dark mode
   - Improved mobile responsive

4. **Unit tests**
   - Service tests
   - Modal component tests
   - Integration tests

---

## 🐛 Troubleshooting

### Problem: The modal doesn't display

**Check:**
1. The `ActivePlanModalComponent` is properly imported in the parent component's `imports`
2. The conditions `*ngIf="showActivePlanModal && activePlanForModal"` are all met
3. No error in the browser console

### Problem: Incorrect navigation after selection

**Check:**
1. The routes in `app.routes.ts` are correctly configured
2. The query params are properly cleaned after processing
3. The `handleRouteQueryParams()` handles all cases

---

## 📞 Support

For any question or issue:
1. Check the browser logs
2. Consult this README
3. Check the comments in the source code

---

**Creation Date:** 02/28/2026  
**Author:** Kimi Code CLI  
**Version:** 1.0.0
