import { Component, HostBinding } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../../shared/components/navbar.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent {
  // Admin theme colors (Violet/Purple)
  @HostBinding('style.--role-primary-light') primaryLight = '#f5f3ff';  // Violet 50
  @HostBinding('style.--role-primary') primary = '#8b5cf6';             // Violet 500
  @HostBinding('style.--role-primary-100') primary100 = '#ede9fe';      // Violet 100
}
