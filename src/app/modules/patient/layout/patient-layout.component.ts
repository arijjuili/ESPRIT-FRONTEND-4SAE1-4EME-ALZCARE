import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar.component';

@Component({
  selector: 'app-patient-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './patient-layout.component.html',
  styleUrls: ['./patient-layout.component.scss']
})
export class PatientLayoutComponent {
  // Patient theme colors (Teal)
  @HostBinding('style.--role-primary-light') primaryLight = '#f0fdfa';  // Teal 50
  @HostBinding('style.--role-primary') primary = '#14b8a6';             // Teal 500
  @HostBinding('style.--role-primary-100') primary100 = '#ccfbf1';      // Teal 100
}
