package com.example.medicalfollowupms.appointment.service;

import com.example.medicalfollowupms.appointment.entity.Appointment;
import com.example.medicalfollowupms.appointment.repository.AppointmentRepository;
import com.example.medicalfollowupms.appointment.entity.AppointmentStatus;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppointmentCrudService {

    private final AppointmentRepository repo;

    // CRUD
    public Appointment create(Appointment appointment) {
        return repo.save(appointment);
    }

    public Appointment getById(Long id) {
        return repo.findById(id).orElseThrow(() -> new EntityNotFoundException("Appointment not found: " + id));
    }

    public List<Appointment> getByDoctor(String doctorId, LocalDateTime from, LocalDateTime to) {
        return repo.findByDoctorIdAndStartAtBetween(doctorId, from, to);
    }

    public List<Appointment> getByPatient(String patientId, LocalDateTime from, LocalDateTime to) {
        return repo.findByPatientIdAndStartAtBetween(patientId, from, to);
    }

    public List<Appointment> getByCaregiver(String caregiverId, LocalDateTime from, LocalDateTime to) {
        return repo.findByCaregiverIdAndStartAtBetween(caregiverId, from, to);
    }

    public Appointment update(Long id, Appointment updated) {
        Appointment existing = getById(id);

        existing.setType(updated.getType());
        existing.setPriority(updated.getPriority());
        existing.setMode(updated.getMode());
        existing.setStatus(updated.getStatus());

        existing.setStartAt(updated.getStartAt());
        existing.setEndAt(updated.getEndAt());

        existing.setAttendanceStatus(updated.getAttendanceStatus());
        existing.setConfirmedByRole(updated.getConfirmedByRole());

        existing.setOutcomeType(updated.getOutcomeType());
        existing.setMeetingUrl(updated.getMeetingUrl());

        // ids
        existing.setPatientId(updated.getPatientId());
        existing.setDoctorId(updated.getDoctorId());
        existing.setCaregiverId(updated.getCaregiverId());

        return repo.save(existing);
    }

    public void delete(Long id) {
        if (!repo.existsById(id)) throw new EntityNotFoundException("Appointment not found: " + id);
        repo.deleteById(id);
    }

    // Status change (simple MVP)
    public Appointment changeStatus(Long id, AppointmentStatus newStatus) {
        Appointment existing = getById(id);
        existing.setStatus(newStatus);
        return repo.save(existing);
    }
}
