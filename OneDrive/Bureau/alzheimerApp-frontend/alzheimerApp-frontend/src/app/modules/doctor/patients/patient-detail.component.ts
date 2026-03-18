import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

/**
 * Patient Detail Component - Placeholder
 * 
 * Basic patient detail view that can be expanded later
 * with full medical history, prescriptions, etc.
 */
@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="patient-detail-container">
      <div class="header">
        <a routerLink="/doctor/patients" class="btn-back">← Retour à la liste</a>
        <h1>Dossier Patient</h1>
        <p class="patient-id">ID: {{ patientId }}</p>
      </div>
      
      <div class="content-placeholder">
        <div class="placeholder-icon">📋</div>
        <h2>Dossier patient en cours de développement</h2>
        <p>Cette page affichera prochainement :</p>
        <ul>
          <li>Informations personnelles du patient</li>
          <li>Historique médical complet</li>
          <li>Plans de médication en cours</li>
          <li>Historique des rendez-vous</li>
          <li>Notes et observations</li>
        </ul>
        
        <div class="quick-actions">
          <a [routerLink]="['/doctor/patients', patientId, 'prescriptions']" class="btn-action">
            💊 Voir prescriptions
          </a>
          <a [routerLink]="['/doctor/patients', patientId, 'appointments']" class="btn-action">
            📅 Voir rendez-vous
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .patient-detail-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }

    .header {
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #e5e7eb;

      h1 {
        font-size: 1.875rem;
        font-weight: 700;
        color: #1f2937;
        margin: 1rem 0 0.25rem;
      }

      .patient-id {
        color: #6b7280;
        margin: 0;
      }
    }

    .btn-back {
      display: inline-flex;
      align-items: center;
      color: #3b82f6;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s;

      &:hover {
        color: #2563eb;
      }
    }

    .content-placeholder {
      background: white;
      border-radius: 0.75rem;
      padding: 3rem 2rem;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

      .placeholder-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
      }

      h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #374151;
        margin: 0 0 1rem;
      }

      p {
        color: #6b7280;
        margin-bottom: 1rem;
      }

      ul {
        display: inline-block;
        text-align: left;
        color: #6b7280;
        margin-bottom: 2rem;

        li {
          margin: 0.5rem 0;
        }
      }
    }

    .quick-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 500;
      transition: all 0.2s;

      &:hover {
        background: #2563eb;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
    }
  `]
})
export class PatientDetailComponent implements OnInit {
  patientId = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.patientId = params['id'];
    });
  }
}
