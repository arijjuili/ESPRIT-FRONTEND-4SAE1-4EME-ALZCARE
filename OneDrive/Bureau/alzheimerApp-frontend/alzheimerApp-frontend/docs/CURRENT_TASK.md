# Current Task - CareHub

**Started:** 2026-04-04  
**Status:** In Progress  
**Task:** 1.2 Appointment Lifecycle & Medical Priority Management

---

## Task Description
The doctor appointment workflow must now cover the full lifecycle:
- Patient or caregiver requests an appointment.
- Doctor can accept, reject, or reschedule the request.
- Urgent appointments automatically take precedence over routine consultations when conflicts happen.
- After the consultation, the doctor can mark the appointment as completed or cancelled.

---

## Implementation Plan

### Phase 1: Medical Priority Rules
- [x] Classify conflicts as blocking vs preemptible when urgent care overlaps routine visits
- [x] Surface urgent-priority override messaging in availability results

### Phase 2: Appointment Lifecycle UI
- [x] Add accept, reject, confirm, reschedule, complete, and cancel actions in doctor appointments
- [x] Reuse the scheduling modal for rescheduling existing appointments
- [x] Keep urgent/rescheduled requests aligned with the appointment status lifecycle

### Phase 3: Dashboard Alignment
- [x] Update doctor dashboard quick action from direct confirm to accept-request flow
- [x] Add patient dashboard entry point for appointment requests
- [x] Add caregiver dashboard entry point for appointment requests
- [x] Reuse a shared appointment request form for patient/caregiver dashboards
- [ ] Manual browser test of full lifecycle flow

---

## Files Touched
- [x] `src/app/core/models/medical-followup.model.ts`
- [x] `src/app/core/services/appointment-scheduling.service.ts`
- [x] `src/app/shared/components/appointment-request-card.component.ts`
- [x] `src/app/shared/components/appointment-request-card.component.html`
- [x] `src/app/modules/patient/dashboard/patient-dashboard.component.ts`
- [x] `src/app/modules/patient/dashboard/patient-dashboard.component.html`
- [x] `src/app/modules/patient/appointments/patient-appointments.component.ts`
- [x] `src/app/modules/caregiver/dashboard/caregiver-dashboard.component.ts`
- [x] `src/app/modules/caregiver/dashboard/caregiver-dashboard.component.html`
- [x] `src/app/modules/doctor/appointments/doctor-appointments.component.ts`
- [x] `src/app/modules/doctor/appointments/doctor-appointments.component.html`
- [x] `src/app/modules/doctor/appointments/doctor-appointments.component.scss`
- [x] `src/app/modules/doctor/dashboard/doctor-dashboard.component.ts`
- [x] `src/app/modules/doctor/dashboard/doctor-dashboard.component.html`

---

## Notes / Issues
- Patient/caregiver requests now reuse a shared modal and route to the existing linked doctor when available, with `doctor@doctor.com` / fallback doctor ID still used for temporary routing.
- `npx tsc --noEmit` still fails only on pre-existing errors in `patient-dashboard-redesign.component.ts`.
- Manual browser verification is still pending in a local `ng serve` session.

---

## Completion Checklist
- [x] Feature implemented
- [x] Automated verification attempted (`npx tsc --noEmit`, blocked only by unrelated legacy file)
- [ ] Manual browser test completed
- [ ] ARCHITECTURE.md updated (not required)
- [ ] DESIGN_SYSTEM.md updated (not required)
- [x] CHANGELOG.md entry written
- [ ] CURRENT_TASK.md cleared for next task
