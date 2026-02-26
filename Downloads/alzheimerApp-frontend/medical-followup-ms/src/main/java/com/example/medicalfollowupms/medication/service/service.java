package com.example.medicalfollowupms.medication.service;

import com.example.medicalfollowupms.medication.entity.MedicationIntake;
import com.example.medicalfollowupms.medication.entity.MedicationItem;
import com.example.medicalfollowupms.medication.entity.MedicationPlan;
import com.example.medicalfollowupms.medication.Repositories.MedicationIntakeRepository;
import com.example.medicalfollowupms.medication.Repositories.MedicationItemRepository;
import com.example.medicalfollowupms.medication.Repositories.MedicationPlanRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class service {

    private final MedicationPlanRepository planRepo;
    private final MedicationItemRepository itemRepo;
    private final MedicationIntakeRepository intakeRepo;

    // ---------------- PLAN CRUD ----------------
    public MedicationPlan createPlan(MedicationPlan plan) {
        return planRepo.save(plan);
    }

    public MedicationPlan getPlan(Long id) {
        return planRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Plan not found: " + id));
    }

    public List<MedicationPlan> getPlansByPatient(String patientId) {
        return planRepo.findByPatientId(patientId);
    }

    public MedicationPlan updatePlan(Long id, MedicationPlan updated) {
        MedicationPlan existing = getPlan(id);

        // update champs (mets uniquement ce que tu veux autoriser)
        existing.setTitle(updated.getTitle());
        existing.setNotes(updated.getNotes());
        existing.setStartDate(updated.getStartDate());
        existing.setEndDate(updated.getEndDate());
        existing.setAutonomyLevel(updated.getAutonomyLevel());
        existing.setStatus(updated.getStatus());

        return planRepo.save(existing);
    }

    public void deletePlan(Long id) {
        if (!planRepo.existsById(id)) throw new EntityNotFoundException("Plan not found: " + id);
        planRepo.deleteById(id);
    }

    // ---------------- ITEM CRUD ----------------
    @Transactional
    public MedicationItem addItemToPlan(Long planId, MedicationItem item) {
        MedicationPlan plan = getPlan(planId);
        item.setPlan(plan);
        return itemRepo.save(item);
    }

    public MedicationItem getItem(Long id) {
        return itemRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Item not found: " + id));
    }

    public List<MedicationItem> getItemsByPlan(Long planId) {
        return itemRepo.findByPlanId(planId);
    }

    public MedicationItem updateItem(Long id, MedicationItem updated) {
        MedicationItem existing = getItem(id);

        existing.setName(updated.getName());
        existing.setDosage(updated.getDosage());
        existing.setFrequency(updated.getFrequency());
        existing.setTimesOfDay(updated.getTimesOfDay());
        existing.setIsHighRisk(updated.getIsHighRisk());
        existing.setStockQuantity(updated.getStockQuantity());
        existing.setLowThreshold(updated.getLowThreshold());
        existing.setExpirationDate(updated.getExpirationDate());

        return itemRepo.save(existing);
    }

    public void deleteItem(Long id) {
        if (!itemRepo.existsById(id)) throw new EntityNotFoundException("Item not found: " + id);
        itemRepo.deleteById(id);
    }

    // ---------------- INTAKE CRUD ----------------
    public MedicationIntake getIntake(Long id) {
        return intakeRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("Intake not found: " + id));
    }

    public List<MedicationIntake> getIntakesByItem(Long itemId) {
        return intakeRepo.findByItemId(itemId);
    }

    @Transactional
    public MedicationIntake addIntakeToItem(Long itemId, MedicationIntake intake) {
        MedicationItem item = getItem(itemId);
        intake.setItem(item);
        return intakeRepo.save(intake);
    }

    public MedicationIntake updateIntake(Long id, MedicationIntake updated) {
        MedicationIntake existing = getIntake(id);

        existing.setScheduledAt(updated.getScheduledAt());
        existing.setStatus(updated.getStatus());
        existing.setConfirmedByRole(updated.getConfirmedByRole());

        return intakeRepo.save(existing);
    }

    public void deleteIntake(Long id) {
        if (!intakeRepo.existsById(id)) throw new EntityNotFoundException("Intake not found: " + id);
        intakeRepo.deleteById(id);
    }
}
