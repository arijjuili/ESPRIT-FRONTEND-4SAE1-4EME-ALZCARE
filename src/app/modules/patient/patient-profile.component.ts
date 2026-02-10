import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-patient-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss']
})
export class PatientProfileComponent implements OnInit {
  patientName = '';

  constructor(private authService: AuthService, private dataService: DataService) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.patientName = currentUser.name;
    }
  }
}
