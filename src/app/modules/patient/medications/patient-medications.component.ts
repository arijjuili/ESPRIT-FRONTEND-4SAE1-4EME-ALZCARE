import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-patient-medications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-medications.component.html',
  styleUrls: ['./patient-medications.component.scss']
})
export class PatientMedicationsComponent implements OnInit {
  medications: any[] = [];

  constructor(private dataService: DataService, private authService: AuthService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const patient = this.dataService.getPatients()[0];
      if (patient) {
        this.medications = patient.currentMedications;
      }
    }
  }
}
