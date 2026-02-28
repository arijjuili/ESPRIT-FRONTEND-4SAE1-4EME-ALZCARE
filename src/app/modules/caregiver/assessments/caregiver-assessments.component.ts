import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { HealthRecord, RecordType } from '../../../core/models/api.model';

interface AssessmentWithPatient {
  assessment: HealthRecord;
  patientName: string;
}

@Component({
  selector: 'app-caregiver-assessments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './caregiver-assessments.component.html',
  styleUrls: ['./caregiver-assessments.component.scss']
})
export class CaregiverAssessmentsComponent implements OnInit {
  assessments: AssessmentWithPatient[] = [];
  patients: PatientProfileResponse[] = [];
  isLoading = false;
  error = '';

  constructor(
    private patientService: PatientService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    this.loadPatientsAndAssessments();
  }

  loadPatientsAndAssessments(): void {
    this.isLoading = true;
    this.patientService.getPatients().subscribe({
      next: (patients) => {
        this.patients = patients;
        if (!patients.length) {
          this.assessments = [];
          this.isLoading = false;
          return;
        }

        const requests = patients.map(patient =>
          this.apiService.getHealthRecords(patient.userId, undefined, RecordType.ASSESSMENT)
        );

        forkJoin(requests).subscribe({
          next: (recordsByPatient) => {
            const combined: AssessmentWithPatient[] = [];
            recordsByPatient.forEach((records, index) => {
              const patient = patients[index];
              const completed = records.filter(record => !!record.completedAt && !record.isActive);
              const latest = completed.sort((a, b) => {
                const aDate = new Date(a.completedAt || a.date).getTime();
                const bDate = new Date(b.completedAt || b.date).getTime();
                return bDate - aDate;
              })[0];
              if (latest) {
                combined.push({
                  assessment: latest,
                  patientName: `${patient.firstName} ${patient.lastName}`
                });
              }
            });
            this.assessments = combined;
            this.isLoading = false;
          },
          error: () => {
            this.error = 'Failed to load assessments.';
            this.isLoading = false;
          }
        });
      },
      error: () => {
        this.error = 'Failed to load patients.';
        this.isLoading = false;
      }
    });
  }
}
