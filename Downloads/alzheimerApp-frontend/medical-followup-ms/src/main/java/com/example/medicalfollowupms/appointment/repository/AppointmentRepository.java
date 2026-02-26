package com.example.medicalfollowupms.appointment.repository;

import com.example.medicalfollowupms.appointment.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    List<Appointment> findByDoctorIdAndStartAtBetween(String doctorId, LocalDateTime from, LocalDateTime to);

    List<Appointment> findByPatientIdAndStartAtBetween(String patientId, LocalDateTime from, LocalDateTime to);

    List<Appointment> findByCaregiverIdAndStartAtBetween(String caregiverId, LocalDateTime from, LocalDateTime to);

}