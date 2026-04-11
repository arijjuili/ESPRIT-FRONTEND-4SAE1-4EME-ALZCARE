import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './doctor-layout.component.html',
  styleUrls: ['./doctor-layout.component.scss']
})
export class DoctorLayoutComponent {
  // Doctor theme colors (Emerald)
  @HostBinding('style.--role-primary-light') primaryLight = '#ecfdf5';  // Emerald 50
  @HostBinding('style.--role-primary') primary = '#10b981';             // Emerald 500
  @HostBinding('style.--role-primary-100') primary100 = '#d1fae5';      // Emerald 100
}
