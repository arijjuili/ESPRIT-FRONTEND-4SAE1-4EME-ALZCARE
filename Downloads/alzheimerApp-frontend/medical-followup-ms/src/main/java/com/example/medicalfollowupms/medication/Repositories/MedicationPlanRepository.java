package com.example.medicalfollowupms.medication.Repositories;


import com.example.medicalfollowupms.medication.entity.MedicationPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationPlanRepository extends JpaRepository<MedicationPlan, Long> {
    List<MedicationPlan> findByPatientId(String patientId);
}
