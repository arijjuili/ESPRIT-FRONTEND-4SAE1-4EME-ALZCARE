import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar.component';

@Component({
  selector: 'app-caregiver-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './caregiver-layout.component.html',
  styleUrls: ['./caregiver-layout.component.scss']
})
export class CaregiverLayoutComponent {
  // Caregiver theme colors (Emerald/Green)
  @HostBinding('style.--role-primary-light') primaryLight = '#ecfdf5';  // Emerald 50
  @HostBinding('style.--role-primary') primary = '#10b981';             // Emerald 500
  @HostBinding('style.--role-primary-100') primary100 = '#d1fae5';      // Emerald 100
}
