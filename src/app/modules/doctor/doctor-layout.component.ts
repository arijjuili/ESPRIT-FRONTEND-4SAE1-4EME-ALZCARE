import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar.component';

@Component({
  selector: 'app-doctor-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './doctor-layout.component.html',
  styleUrls: ['./doctor-layout.component.scss']
})
export class DoctorLayoutComponent {
  // Doctor theme colors (Blue)
  @HostBinding('style.--role-primary-light') primaryLight = '#eff6ff';  // Blue 50
  @HostBinding('style.--role-primary') primary = '#3b82f6';             // Blue 500
  @HostBinding('style.--role-primary-100') primary100 = '#dbeafe';      // Blue 100
}
