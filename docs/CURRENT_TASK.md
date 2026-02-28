# Current Task

> Status: ✅ Completed
> Last Updated: 2026-02-25

---

## Task Description
Daily check-in modal for patients, assessment scheduling and MMSE flow using HealthRecord (ASSESSMENT), doctor/caregiver assessment views, and doctor-patient coordination endpoints.

---

## Implementation Plan

### Phase 1
- [x] Add doctor-patient endpoints in identity-service
- [x] Extend HealthRecord for scheduling fields and assessment submission

### Phase 2
- [x] Patient daily check-in modal + MMSE assessment page
- [x] Doctor/Caregiver assessment lists + result views
- [x] Sidebar + routes + API models

---

## Files Touched
- [x] `alzheimerApp-backend/identity-service/src/main/java/com/alzcare/identity/controllers/DoctorProfileController.java`
- [x] `alzheimerApp-backend/identity-service/src/main/java/com/alzcare/identity/entities/PatientProfile.java`
- [x] `alzheimerApp-backend/cognitive-memory/src/main/java/com/alzcare/cognitivememory/controllers/HealthRecordController.java`
- [x] `alzheimerApp/src/app/modules/patient/dashboard/patient-dashboard.component.ts`
- [x] `alzheimerApp/src/app/modules/doctor/assessments/doctor-assessments.component.ts`

---

## Notes / Issues
- HealthRecord now carries assessment frequency and next due date.
