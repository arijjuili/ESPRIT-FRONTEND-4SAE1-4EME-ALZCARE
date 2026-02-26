package com.example.medicalfollowupms.appointment.entity;


import com.example.medicalfollowupms.medication.entity.ValidatorRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "appointment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔹 Relations métier (références simples pour MVP)
    @Column(nullable = false)
    private String patientId;

    @Column(nullable = false)
    private String doctorId;

    private String caregiverId; // optionnel

    // 🔹 Type & priorité
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentPriority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentMode mode;

    // 🔹 Statut workflow
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status;

    // 🔹 Planning
    @Column(nullable = false)
    private LocalDateTime startAt;

    @Column(nullable = false)
    private LocalDateTime endAt;

    // 🔹 Confirmation & présence
    @Enumerated(EnumType.STRING)
    private ValidatorRole confirmedByRole;

    @Enumerated(EnumType.STRING)
    private AttendanceStatus attendanceStatus;

    // 🔹 Résultat médical
    @Enumerated(EnumType.STRING)
    private OutcomeType outcomeType;

    // 🔹 Téléconsultation (si mode ONLINE)
    private String meetingUrl;

    // 🔹 Audit
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    // 🔹 Hooks automatiques
    @PrePersist
    public void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = createdAt;
        if (this.status == null) {
            this.status = AppointmentStatus.REQUESTED;
        }
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
