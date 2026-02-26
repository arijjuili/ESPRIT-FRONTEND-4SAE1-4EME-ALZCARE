package com.example.medicalfollowupms.appointment.controller;

import com.example.medicalfollowupms.appointment.entity.Appointment;
import com.example.medicalfollowupms.appointment.service.AppointmentCrudService;
import com.example.medicalfollowupms.appointment.entity.AppointmentStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentCrudService service;

    // CREATE
    @PostMapping
    public Appointment create(@RequestBody Appointment appointment) {
        return service.create(appointment);
    }

    // READ
    @GetMapping("/{id}")
    public Appointment getById(@PathVariable Long id) {
        return service.getById(id);
    }

    // LIST (doctor/patient/caregiver) + date range
    @GetMapping
    public List<Appointment> list(
            @RequestParam(required = false) String doctorId,
            @RequestParam(required = false) String patientId,
            @RequestParam(required = false) String caregiverId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to
    ) {
        if (doctorId != null) return service.getByDoctor(doctorId, from, to);
        if (patientId != null) return service.getByPatient(patientId, from, to);
        if (caregiverId != null) return service.getByCaregiver(caregiverId, from, to);

        throw new IllegalArgumentException("Provide doctorId OR patientId OR caregiverId");
    }

    // UPDATE
    @PutMapping("/{id}")
    public Appointment update(@PathVariable Long id, @RequestBody Appointment appointment) {
        return service.update(id, appointment);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }

    // CHANGE STATUS (PATCH)
    @PatchMapping("/{id}/status")
    public Appointment changeStatus(@PathVariable Long id, @RequestParam AppointmentStatus status) {
        return service.changeStatus(id, status);
    }
}
