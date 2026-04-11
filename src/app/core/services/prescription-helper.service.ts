/**
 * Prescription Helper Service
 * 
 * This service manages the logic for checking active medication plans
 * when a doctor wants to prescribe for a patient.
 * 
 * Scenario:
 * 1. Doctor clicks "Prescribe"
 * 2. System checks if an active Medication Plan exists
 * 3. If no → direct navigation to creation
 * 4. If yes → display modal with options
 */
import { Injectable, ComponentRef, createComponent, EnvironmentInjector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, take } from 'rxjs/operators';
import { MedicalFollowupService } from './medical-followup.service';
import { MedicationPlan, PlanStatus } from '../models/medical-followup.model';

/**
 * Result of checking for an active plan
 */
export interface ActivePlanCheckResult {
  hasActivePlan: boolean;
  activePlan: MedicationPlan | null;
}

/**
 * Action chosen by the doctor when an active plan exists
 */
export type PrescriptionAction = 
  | 'ADJUST_CURRENT'      // Modify the current plan
  | 'ADD_MEDICATION'      // Add a medication to the current plan
  | 'REPLACE_TREATMENT'   // Replace the treatment (new plan)
  | 'CANCEL';             // Cancel the operation

/**
 * Result of a prescription action
 */
export interface PrescriptionActionResult {
  action: PrescriptionAction;
  plan?: MedicationPlan;
  patientId: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrescriptionHelperService {
  private medicalService = inject(MedicalFollowupService);
  private router = inject(Router);

  /**
   * Checks if a patient has an active medication plan
   * 
   * @param patientId - Patient ID
   * @returns Observable with the check result
   */
  checkActivePlan(patientId: string): Observable<ActivePlanCheckResult> {
    return this.medicalService.getPatientMedicationPlans(patientId).pipe(
      map(plans => {
        // Look for an active plan (not ended, not suspended)
        const activePlan = plans.find(plan => 
          plan.status === PlanStatus.ACTIVE || 
          (plan.status !== PlanStatus.STOPPED && this.isPlanCurrentlyActive(plan))
        );
        
        return {
          hasActivePlan: !!activePlan,
          activePlan: activePlan || null
        };
      }),
      catchError(error => {
        console.error('Error checking active plan:', error);
        // In case of error, assume no active plan exists
        // to allow the doctor to continue
        return of({ hasActivePlan: false, activePlan: null });
      })
    );
  }

  /**
   * Determines if a plan is currently active based on dates
   */
  private isPlanCurrentlyActive(plan: MedicationPlan): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(plan.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    // If start date is in the future → not active
    if (startDate > today) {
      return false;
    }
    
    // If no end date → active indefinitely
    if (!plan.endDate) {
      return true;
    }
    
    const endDate = new Date(plan.endDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Active if today is between startDate and endDate
    return today <= endDate;
  }

  /**
   * Handles the complete prescription flow:
   * 1. Checks if an active plan exists
   * 2. If yes → displays the modal
   * 3. If no → navigates directly to creation
   * 
   * @param patientId - Patient ID
   * @param openModalFn - Function to open the modal (returns a Promise with the action)
   */
  async handlePrescribeFlow(
    patientId: string,
    openModalFn: (plan: MedicationPlan, patientId: string) => Promise<PrescriptionAction>
  ): Promise<void> {
    try {
      const result = await this.checkActivePlan(patientId).pipe(take(1)).toPromise();
      
      if (!result) {
        console.error('No result from checkActivePlan');
        this.navigateToNewPrescription(patientId);
        return;
      }

      if (result.hasActivePlan && result.activePlan) {
        // An active plan exists → display the modal
        console.log('Active plan found:', result.activePlan);
        const action = await openModalFn(result.activePlan, patientId);
        this.handleAction(action, patientId, result.activePlan);
      } else {
        // No active plan → direct navigation
        console.log('No active plan found, navigating to new prescription');
        this.navigateToNewPrescription(patientId);
      }
    } catch (error) {
      console.error('Error in prescribe flow:', error);
      // In case of error, allow default navigation
      this.navigateToNewPrescription(patientId);
    }
  }

  /**
   * Handles the action chosen in the modal
   * Note: ADJUST_CURRENT is handled by the AdjustPlanComponent, not navigation
   */
  private handleAction(
    action: PrescriptionAction, 
    patientId: string, 
    activePlan: MedicationPlan
  ): void {
    switch (action) {
      case 'ADJUST_CURRENT':
        // ADJUST_CURRENT is handled by the component that opened the modal
        // The component should listen for this action and open AdjustPlanComponent
        console.log('Action: Adjust current plan - handled by parent component');
        break;

      case 'ADD_MEDICATION':
        // Navigate to the existing plan to add a medication
        console.log('Action: Add medication to current plan', activePlan.id);
        this.router.navigate(['/doctor/patients', patientId, 'prescriptions'], {
          queryParams: { 
            action: 'add-medication', 
            planId: activePlan.id 
          }
        });
        break;

      case 'REPLACE_TREATMENT':
        // Navigate to create a new plan
        console.log('Action: Replace treatment');
        this.navigateToNewPrescription(patientId, { replace: 'true' });
        break;

      case 'CANCEL':
        // Do nothing, user cancelled
        console.log('Action: Cancelled');
        break;

      default:
        console.warn('Unknown action:', action);
    }
  }

  /**
   * Navigation to the prescription creation page
   */
  private navigateToNewPrescription(
    patientId: string, 
    queryParams: Record<string, string> = {}
  ): void {
    this.router.navigate(['/doctor/patients', patientId, 'prescriptions'], {
      queryParams
    });
  }
}
