package com.example.medicalfollowupms.medication.Repositories;

import com.example.medicalfollowupms.medication.entity.MedicationIntake;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationIntakeRepository extends JpaRepository<MedicationIntake, Long> {
    List<MedicationIntake> findByItemId(Long itemId);
}
