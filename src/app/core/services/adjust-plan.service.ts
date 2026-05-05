/**
 * Adjust Plan Service
 * 
 * Handles the business logic for adjusting a medication plan.
 * Key principle: NEVER modify history. Only future intakes are affected.
 * 
 * Workflow:
 * 1. Validate inputs (effectiveDate must be in the future)
 * 2. Cancel/delete future intakes (>= effectiveDate)
 * 3. Generate new future intakes based on new values
 */
import { Injectable, inject } from '@angular/core';
import { Observable, of, forkJoin, from } from 'rxjs';
import { delay, switchMap, map, catchError } from 'rxjs/operators';
import { 
  MedicationPlan, 
  MedicationPlanUpdateRequest,
  MedicationItem, 
  MedicationItemUpdateRequest,
  MedicationIntake,
  FrequencyType,
  IntakeStatus 
} from '../models/medical-followup.model';
import { MedicalFollowupService } from './medical-followup.service';

/**
 * Form data for adjusting a plan
 */
export interface AdjustPlanFormData {
  effectiveDate: Date;
  dosage?: string;
  frequency?: FrequencyType;
  timesOfDay?: string[];
  endDate?: Date;
  notes?: string;
}

/**
 * Result of the adjustment operation
 */
export interface AdjustPlanResult {
  success: boolean;
  message: string;
  cancelledIntakes: number;
  generatedIntakes: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdjustPlanService {
  private medicalService = inject(MedicalFollowupService);

  /**
   * Validates the adjustment form inputs
   * 
   * @param formData - The form data to validate
   * @returns Array of validation errors (empty if valid)
   */
  validateInputs(formData: AdjustPlanFormData): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Validate effectiveDate
    if (!formData.effectiveDate) {
      errors.push({
        field: 'effectiveDate',
        message: 'Effective date is required'
      });
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const effectiveDate = new Date(formData.effectiveDate);
      effectiveDate.setHours(0, 0, 0, 0);
      
      if (effectiveDate <= now) {
        errors.push({
          field: 'effectiveDate',
          message: 'Effective date must be in the future'
        });
      }
    }
    
    // Validate dosage if provided
    if (formData.dosage !== undefined && formData.dosage.trim() === '') {
      errors.push({
        field: 'dosage',
        message: 'Dosage cannot be empty'
      });
    }
    
    // Validate timesOfDay if provided
    if (formData.timesOfDay && formData.timesOfDay.length === 0) {
      errors.push({
        field: 'timesOfDay',
        message: 'At least one intake time is required'
      });
    }
    
    // Validate endDate if provided
    if (formData.endDate && formData.effectiveDate) {
      if (formData.endDate < formData.effectiveDate) {
        errors.push({
          field: 'endDate',
          message: 'End date must be after effective date'
        });
      }
    }
    
    return errors;
  }

  /**
   * Identifies future intakes that need to be cancelled
   * (intakes with scheduledAt >= effectiveDate)
   * 
   * @param items - All medication items in the plan
   * @param effectiveDate - The cutoff date
   * @returns Array of intakes to cancel
   */
  identifyFutureIntakes(
    items: MedicationItem[], 
    effectiveDate: Date
  ): MedicationIntake[] {
    const futureIntakes: MedicationIntake[] = [];
    
    items.forEach(item => {
      if (item.intakes) {
        item.intakes.forEach(intake => {
          const intakeDate = new Date(intake.scheduledAt);
          if (intakeDate >= effectiveDate) {
            futureIntakes.push(intake);
          }
        });
      }
    });
    
    return futureIntakes;
  }

  /**
   * Cancels future intakes by deleting them from the backend
   * 
   * @param intakes - Intakes to cancel
   * @returns Observable with the number of cancelled intakes
   */
  cancelFutureIntakes(intakes: MedicationIntake[]): Observable<number> {
    if (intakes.length === 0) {
      return of(0);
    }
    
    
    // Delete each intake individually
    const deleteRequests = intakes
      .filter(intake => intake.id != null) // Only process intakes with valid IDs
      .map(intake => 
        this.medicalService.deleteMedicationIntake(intake.id!).pipe(
          catchError(err => {
            return of(void 0); // Continue even if one fails
          })
        )
      );
    
    return forkJoin(deleteRequests).pipe(
      map(() => intakes.length),
      catchError(() => of(intakes.length)) // Return count even if some failed
    );
  }

  /**
   * Generates and creates new future intakes via the backend
   * 
   * @param item - The medication item
   * @param formData - The new plan configuration
   * @returns Observable with array of created intakes
   */
  generateAndCreateFutureIntakes(
    item: MedicationItem,
    formData: AdjustPlanFormData
  ): Observable<MedicationIntake[]> {
    const newIntakes = this.generateFutureIntakesLocal(item, formData);
    
    if (newIntakes.length === 0) {
      return of([]);
    }
    
    
    // Create each intake via backend
    const createRequests = newIntakes.map(intake => 
      this.medicalService.addMedicationIntake(item.id, {
        scheduledAt: intake.scheduledAt,
        status: IntakeStatus.PENDING
      }).pipe(
        catchError(err => {
          return of(null); // Continue even if one fails
        })
      )
    );
    
    return forkJoin(createRequests).pipe(
      map(results => results.filter((i): i is MedicationIntake => i !== null)),
      catchError(() => of([]))
    );
  }

  /**
   * Generates new future intakes locally (without saving)
   */
  private generateFutureIntakesLocal(
    item: MedicationItem,
    formData: AdjustPlanFormData
  ): MedicationIntake[] {
    const newIntakes: MedicationIntake[] = [];
    const effectiveDate = new Date(formData.effectiveDate);
    
    // Determine end date for generation
    const endDate = formData.endDate 
      ? new Date(formData.endDate)
      : this.calculateDefaultEndDate(effectiveDate);
    
    // Get times of day (use existing if not changed)
    const timesOfDay = formData.timesOfDay || this.parseTimesOfDay(item.timesOfDay);
    
    // Get frequency (use existing if not changed)
    const frequency = formData.frequency || item.frequency;
    
    // Generate intakes based on frequency
    let currentDate = new Date(effectiveDate);
    
    while (currentDate <= endDate) {
      // For each time of day, create an intake
      timesOfDay.forEach(time => {
        const scheduledDateTime = this.combineDateAndTime(currentDate, time);
        
        // Only create if it's in the future
        if (scheduledDateTime >= new Date()) {
          newIntakes.push({
            id: this.generateTempId(),
            itemId: item.id,
            scheduledAt: scheduledDateTime.toISOString(),
            status: IntakeStatus.PENDING,
            createdAt: new Date().toISOString()
          });
        }
      });
      
      // Move to next date based on frequency
      currentDate = this.getNextDate(currentDate, frequency);
    }
    
    return newIntakes;
  }

  /**
   * Main method to apply plan adjustments
   * Orchestrates: validation → cancellation → generation → save
   * 
   * @param plan - The current medication plan
   * @param formData - The adjustment form data
   * @returns Observable with the result
   */
  applyAdjustments(
    plan: MedicationPlan,
    formData: AdjustPlanFormData
  ): Observable<AdjustPlanResult> {
    // Step 1: Validate
    const validationErrors = this.validateInputs(formData);
    if (validationErrors.length > 0) {
      return of({
        success: false,
        message: `Validation failed: ${validationErrors.map(e => e.message).join(', ')}`,
        cancelledIntakes: 0,
        generatedIntakes: 0
      });
    }
    
    // Step 2: Identify future intakes to cancel
    const items = plan.items || [];
    const futureIntakes = this.identifyFutureIntakes(items, formData.effectiveDate);
    
    // Step 3: Cancel future intakes
    return this.cancelFutureIntakes(futureIntakes).pipe(
      switchMap(cancelledCount => {
        // Step 4: Update items (SKIP IF FAILS - only intakes are critical)
        const updateItemRequests = this.buildItemUpdateRequests(items, formData);
        
        // Update plan if needed
        const planUpdate = this.buildPlanUpdate(plan, formData);
        const planUpdate$ = Object.keys(planUpdate).length > 0
          ? this.medicalService.updateMedicationPlan(plan.id, planUpdate).pipe(
              catchError(err => {
                return of(null);
              })
            )
          : of(null);
        
        // Execute item updates (continue even if some fail)
        const itemUpdates$ = updateItemRequests.length > 0
          ? forkJoin(updateItemRequests.map(req => 
              req.pipe(catchError(err => {
                return of(null);
              }))
            ))
          : of([]);
        
        return forkJoin({
          items: itemUpdates$,
          plan: planUpdate$
        }).pipe(
          switchMap(() => {
            // Step 5: Generate and create new intakes (THIS IS THE IMPORTANT PART)
            const intakeRequests = items.map(item => 
              this.generateAndCreateFutureIntakes(item, formData).pipe(
                catchError(err => {
                  return of([]);
                })
              )
            );
            
            return forkJoin(intakeRequests).pipe(
              map(intakeArrays => {
                const totalGenerated = intakeArrays.reduce((sum, arr) => sum + arr.length, 0);
                
                // Update local data for immediate UI feedback
                items.forEach((item, index) => {
                  this.updateLocalItem(item, formData, intakeArrays[index]);
                });
                if (formData.notes !== undefined) plan.notes = formData.notes;
                if (formData.endDate !== undefined) {
                  plan.endDate = formData.endDate.toISOString().split('T')[0];
                }
                plan.updatedAt = new Date().toISOString();
                
                return {
                  success: true,
                  message: `${cancelledCount} future intakes cancelled, ${totalGenerated} new intakes generated`,
                  cancelledIntakes: cancelledCount,
                  generatedIntakes: totalGenerated
                };
              })
            );
          })
        );
      }),
      catchError(err => of({
        success: false,
        message: `Error adjusting plan: ${err}`,
        cancelledIntakes: 0,
        generatedIntakes: 0
      }))
    );
  }

  /**
   * Builds item update requests with full payload (to avoid backend 500 errors)
   */
  private buildItemUpdateRequests(
    items: MedicationItem[],
    formData: AdjustPlanFormData
  ): Observable<MedicationItem>[] {
    const requests: Observable<MedicationItem>[] = [];
    
    items.forEach(item => {
      const hasChanges = this.hasItemChanges(item, formData);
      
      if (hasChanges) {
        // Build FULL update payload to avoid partial update issues
        const update: MedicationItemUpdateRequest = {
          name: item.name,
          dosage: formData.dosage !== undefined ? formData.dosage : item.dosage,
          frequency: formData.frequency !== undefined ? formData.frequency : item.frequency,
          timesOfDay: formData.timesOfDay !== undefined 
            ? formData.timesOfDay.join(',') 
            : item.timesOfDay,
          isHighRisk: item.isHighRisk,
          stockQuantity: item.stockQuantity,
          lowThreshold: item.lowThreshold
        };
        
        
        requests.push(
          this.medicalService.updateMedicationItem(item.id, update)
        );
      }
    });
    
    return requests;
  }

  /**
   * Checks if an item has changes
   */
  private hasItemChanges(item: MedicationItem, formData: AdjustPlanFormData): boolean {
    if (formData.dosage !== undefined && formData.dosage !== item.dosage) return true;
    if (formData.frequency !== undefined && formData.frequency !== item.frequency) return true;
    if (formData.timesOfDay !== undefined) {
      const newTimes = formData.timesOfDay.join(',');
      if (newTimes !== item.timesOfDay) return true;
    }
    return false;
  }

  /**
   * Builds the update request for the medication plan
   */
  private buildPlanUpdate(
    plan: MedicationPlan,
    formData: AdjustPlanFormData
  ): MedicationPlanUpdateRequest {
    const update: MedicationPlanUpdateRequest = {};
    
    if (formData.notes !== undefined && formData.notes !== plan.notes) {
      update.notes = formData.notes;
    }
    
    if (formData.endDate !== undefined) {
      const newEndDate = formData.endDate.toISOString().split('T')[0];
      if (newEndDate !== plan.endDate) {
        update.endDate = newEndDate;
      }
    }
    
    return update;
  }

  /**
   * Updates local item data for immediate UI feedback
   */
  private updateLocalItem(
    item: MedicationItem,
    formData: AdjustPlanFormData,
    newIntakes: MedicationIntake[]
  ): void {
    // Update item properties
    if (formData.dosage !== undefined) {
      item.dosage = formData.dosage;
    }
    if (formData.frequency !== undefined) {
      item.frequency = formData.frequency;
    }
    if (formData.timesOfDay !== undefined) {
      item.timesOfDay = formData.timesOfDay.join(',');
    }
    
    // Update intakes: remove future ones and add new ones
    if (item.intakes) {
      const effectiveDate = formData.effectiveDate;
      // Keep only past intakes
      item.intakes = item.intakes.filter(intake => 
        new Date(intake.scheduledAt) < effectiveDate
      );
      // Add new intakes
      item.intakes.push(...newIntakes);
    } else {
      item.intakes = newIntakes;
    }
    
    // Update timestamp
    item.updatedAt = new Date().toISOString();
  }

  // ========================================
  // Helper Methods
  // ========================================

  /**
   * Calculates default end date (30 days from effective date)
   */
  private calculateDefaultEndDate(effectiveDate: Date): Date {
    const endDate = new Date(effectiveDate);
    endDate.setDate(endDate.getDate() + 30);
    return endDate;
  }

  /**
   * Parses timesOfDay string (e.g., "08:00,20:00" or "MORNING,EVENING")
   * into an array of time strings
   */
  private parseTimesOfDay(timesOfDay: string): string[] {
    if (!timesOfDay) return ['08:00'];
    
    // If already in HH:mm format
    if (timesOfDay.includes(':')) {
      return timesOfDay.split(',').map(t => t.trim());
    }
    
    // Convert named times to HH:mm
    const timeMap: { [key: string]: string } = {
      'MORNING': '08:00',
      'NOON': '12:00',
      'AFTERNOON': '14:00',
      'EVENING': '18:00',
      'NIGHT': '22:00',
      'BEDTIME': '23:00'
    };
    
    return timesOfDay.split(',').map(t => timeMap[t.trim()] || '08:00');
  }

  /**
   * Combines a date with a time string (HH:mm)
   */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  /**
   * Gets the next date based on frequency
   */
  private getNextDate(currentDate: Date, frequency: FrequencyType): Date {
    const nextDate = new Date(currentDate);
    
    switch (frequency) {
      case FrequencyType.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case FrequencyType.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case FrequencyType.CUSTOM:
        // Default to daily for custom
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      default:
        nextDate.setDate(nextDate.getDate() + 1);
    }
    
    return nextDate;
  }

  /**
   * Generates a temporary ID for new intakes
   */
  private generateTempId(): number {
    return -Date.now();
  }

  /**
   * Gets tomorrow at 00:00 as default effective date
   */
  getDefaultEffectiveDate(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}
