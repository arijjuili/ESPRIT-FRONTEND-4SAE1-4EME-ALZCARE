package com.example.medicalfollowupms.medication.controller;

import com.example.medicalfollowupms.medication.entity.MedicationIntake;
import com.example.medicalfollowupms.medication.entity.MedicationItem;
import com.example.medicalfollowupms.medication.entity.MedicationPlan;
import com.example.medicalfollowupms.medication.service.service;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/medication")
@RequiredArgsConstructor
public class MedicationController {

    private final service service;

    // ----------- PLAN CRUD -----------
    @PostMapping("/plans")
    public MedicationPlan createPlan(@RequestBody MedicationPlan plan) {
        return service.createPlan(plan);
    }

    @GetMapping("/plans/{id}")
    public MedicationPlan getPlan(@PathVariable Long id) {
        return service.getPlan(id);
    }

    @GetMapping("/plans")
    public List<MedicationPlan> getPlansByPatient(@RequestParam String patientId) {
        return service.getPlansByPatient(patientId);
    }

    @PutMapping("/plans/{id}")
    public MedicationPlan updatePlan(@PathVariable Long id, @RequestBody MedicationPlan plan) {
        return service.updatePlan(id, plan);
    }

    @DeleteMapping("/plans/{id}")
    public void deletePlan(@PathVariable Long id) {
        service.deletePlan(id);
    }

    // ----------- ITEM CRUD -----------
    @PostMapping("/plans/{planId}/items")
    public MedicationItem addItem(@PathVariable Long planId, @RequestBody MedicationItem item) {
        return service.addItemToPlan(planId, item);
    }

    @GetMapping("/plans/{planId}/items")
    public List<MedicationItem> getItems(@PathVariable Long planId) {
        return service.getItemsByPlan(planId);
    }

    @PutMapping("/items/{id}")
    public MedicationItem updateItem(@PathVariable Long id, @RequestBody MedicationItem item) {
        return service.updateItem(id, item);
    }

    @DeleteMapping("/items/{id}")
    public void deleteItem(@PathVariable Long id) {
        service.deleteItem(id);
    }

    // ----------- INTAKE CRUD -----------
    @PostMapping("/items/{itemId}/intakes")
    public MedicationIntake addIntake(@PathVariable Long itemId, @RequestBody MedicationIntake intake) {
        return service.addIntakeToItem(itemId, intake);
    }

    @GetMapping("/items/{itemId}/intakes")
    public List<MedicationIntake> getIntakes(@PathVariable Long itemId) {
        return service.getIntakesByItem(itemId);
    }

    @PutMapping("/intakes/{id}")
    public MedicationIntake updateIntake(@PathVariable Long id, @RequestBody MedicationIntake intake) {
        return service.updateIntake(id, intake);
    }

    @DeleteMapping("/intakes/{id}")
    public void deleteIntake(@PathVariable Long id) {
        service.deleteIntake(id);
    }
}