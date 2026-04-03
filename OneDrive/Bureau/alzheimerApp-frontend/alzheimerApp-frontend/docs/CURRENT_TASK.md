# Current Task - CareHub

**Started:** 2026-04-01  
**Status:** 🟡 In Progress  
**Task:** 2️⃣ Smart Scheduling Conflict Resolution & Availability Control (Module 1.2)

---

## Task Description
When a doctor schedules an appointment, the UI must:
- Detect scheduling conflicts between doctor, patient, and (when linked/required) caregiver.
- Take caregiver availability into account, including a transport dependency buffer for onsite visits.
- Propose alternative compatible time slots when a conflict is detected.
- Allow the doctor to choose a suggested slot, then confirm by creating the appointment.

---

## Implementation Plan

### Phase 1: Scheduling Logic
- [x] Add a scheduling service for LocalDateTime parsing, overlap detection, and slot suggestions
- [x] Define conflicts and suggested slot types for the UI

### Phase 2: Doctor UI Integration
- [x] Add "Check availability" to the appointment creation modal
- [x] Show conflicts and suggested alternative slots
- [x] Block onsite scheduling when caregiver is required but not linked
- [ ] Manual test in browser (doctor flow)

---

## Files to Touch
- [x] `src/app/core/services/appointment-scheduling.service.ts`
- [x] `src/app/modules/doctor/appointments/doctor-appointments.component.ts`
- [x] `src/app/modules/doctor/appointments/doctor-appointments.component.html`

---

## Notes / Issues
- `ng build` currently fails in this environment with `spawn EPERM` (esbuild-wasm). Manual testing should be done via `ng serve` on the machine/environment where spawning is allowed.
- `npx tsc` reports pre-existing errors in `patient-dashboard-redesign.component.ts` unrelated to this task.

---

## Completion Checklist
- [x] Feature implemented
- [ ] Tested (manual or automated)
- [ ] ARCHITECTURE.md updated (if needed)
- [ ] DESIGN_SYSTEM.md updated (if needed)
- [ ] CHANGELOG.md entry written
- [ ] CURRENT_TASK.md cleared for next task
