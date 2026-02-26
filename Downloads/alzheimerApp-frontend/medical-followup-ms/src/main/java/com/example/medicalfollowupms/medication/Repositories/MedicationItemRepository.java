package com.example.medicalfollowupms.medication.Repositories;

import com.example.medicalfollowupms.medication.entity.MedicationItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationItemRepository extends JpaRepository<MedicationItem, Long> {
    List<MedicationItem> findByPlanId(Long planId);
}
