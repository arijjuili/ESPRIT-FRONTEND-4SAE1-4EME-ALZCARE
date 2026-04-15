import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { DataService } from '../../../core/services/data.service';
import { DashboardOverview, DashboardService } from '../../../core/services/dashboard.service';
import { DailyCareService } from '../../../core/services/daily-care.service';
import { PatientService, PatientProfileResponse } from '../../../core/services/patient.service';
import { CareTeamService } from '../../../core/services/care-team.service';
import { DoctorWorkflowService } from '../../../core/services/doctor-workflow.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { StatCardComponent } from '../../../shared/components/stat-card.component';
import { AlertCardComponent } from '../../../shared/components/alert-card.component';
import { NotificationBellComponent } from '../../../shared/components/notification-bell/notification-bell.component';
import { WeatherPrayerCardComponent } from '../../../shared/components/weather-prayer-card.component';
import { RoleTheme } from '../../../shared/components/navbar.component';
import { DoctorAssignment, DoctorAssignmentStatus } from '../../../core/models/care-team.model';
import { AutonomySuggestion, AutonomySuggestionDecisionRequest } from '../../../core/models/daily-care.model';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-doctor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, StatCardComponent, AlertCardComponent, NotificationBellComponent, WeatherPrayerCardComponent],
  templateUrl: './doctor-dashboard.component.html',
  styleUrls: ['./doctor-dashboard.component.scss']
})
export class DoctorDashboardComponent implements OnInit {
  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>;

  doctorName = '';
  doctorId: string | null = null;
  
  // Role theme for notification bell (blue for doctor)
  currentTheme: RoleTheme = {
    name: 'Doctor',
    primary: '#3b82f6',
    primaryLight: '#eff6ff',
    primaryDark: '#1d4ed8',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
    borderColor: '#dbeafe',
    hoverBg: '#dbeafe',
    activeBg: '#3b82f6',
    activeText: '#ffffff'
  };
  
  // Doctor's assigned patients
  doctorAssignments: DoctorAssignment[] = [];
  /** Keycloak userId -> name from identity (care-team assignments rarely include patientFirstName/LastName) */
  patientProfilesByUserId: Record<string, { firstName: string; lastName: string }> = {};
  /** patientIds we looked up in identity but got no profile (orphan care-team rows, tests, or deleted users) */
  patientIdsMissingProfile = new Set<string>();
  loadingPatients = false;
  
  // Legacy data for compatibility
  patients: any[] = [];
  appointments: any[] = [];
  dashboardOverview: DashboardOverview | null = null;
  loadingOverview = false;

  /** Live text from care-team NewsAPI integration (when configured) */
  researchNewsPreview: string | null = null;
  /** Curated bullets when live news is unavailable (reads like content, not an error page) */
  researchCuratedBullets: string[] | null = null;
  /** Optional short line under curated list (non-technical, e.g. feed unavailable) */
  researchNewsFooterNote: string | null = null;
  /** True after first research-news request finishes */
  researchNewsLoaded = false;

  // Autonomy AI review
  selectedAutonomyPatientId = '';
  autonomySuggestions: AutonomySuggestion[] = [];
  loadingAutonomy = false;
  autonomyReviewNote = '';
  showSignatureModal = false;
  pendingReportSuggestion: AutonomySuggestion | null = null;
  private isDrawingSignature = false;
  private signatureLastX = 0;
  private signatureLastY = 0;

  /** Shown when live headlines are unavailable; clinical tone only */
  private static readonly RESEARCH_CURATED_DEFAULT = [
    'Early Alzheimer’s disease often includes memory changes that interfere with everyday activities — use standardized tools (e.g. MMSE/MoCA) alongside history when staging.',
    'Combine medication plans with non-pharmacologic support: structured routine, sleep hygiene, and caregiver education often improve safety and quality of life.',
    'Discuss advance care planning, driving, and supervision needs early; align with your institution’s policies and local regulations.'
  ];

  /** PDF: doctor creates patient account */
  showCreatePatientModal = false;
  creatingPatient = false;
  createPatientForm: FormGroup;
  lastGeneratedPatientPassword: string | null = null;

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private dataService: DataService,
    private dashboardService: DashboardService,
    private dailyCareService: DailyCareService,
    private patientService: PatientService,
    private careTeamService: CareTeamService,
    private doctorWorkflow: DoctorWorkflowService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    const today = new Date();
    const defaultDob = new Date(today.getFullYear() - 72, 0, 1).toISOString().split('T')[0];
    this.createPatientForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/)]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      dateOfBirth: [defaultDob, Validators.required],
      gender: ['MALE', Validators.required],
      phone: [''],
      address: [''],
      emergencyContact: [''],
      diagnosisStage: ['']
    });
  }

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    const userId = this.authService.getCurrentUserId();
    console.log('currentUser =', currentUser);
    console.log('userId =', userId);

    if (!currentUser || !userId) {
      this.toastService.error('User session invalid. Please login again.', 'Authentication Error');
      return;
    }

    this.doctorName = currentUser.name;
    this.patients = this.dataService.getPatients();
    this.appointments = this.dataService.getAppointments();
    this.loadResearchNews();

    // Resolve the backend doctor profile UUID from the Keycloak userId before
    // calling care-team endpoints.
    this.apiService.getDoctorByUserId(userId).subscribe({
      next: (doctorProfile) => {
        this.doctorId = doctorProfile.id;
        this.loadDoctorPatients();
      },
      error: (error) => {
        console.error('Error resolving doctor profile UUID:', error);
        if (error.status === 400) {
          this.toastService.error('Invalid user ID format. Please contact support.', 'Error');
        } else if (error.status === 404) {
          this.toastService.error('Doctor profile not found. Please contact administrator.', 'Error');
        } else {
          this.toastService.error('Failed to load doctor profile. Please try again.', 'Error');
        }
        this.doctorAssignments = [];
      }
    });
  }

  private loadResearchNews(): void {
    this.researchNewsPreview = null;
    this.researchCuratedBullets = null;
    this.researchNewsFooterNote = null;
    this.researchNewsLoaded = false;
    this.careTeamService
      .researchNews()
      .pipe(
        catchError(() => of('__NETWORK_ERROR__')),
        finalize(() => {
          this.researchNewsLoaded = true;
        })
      )
      .subscribe((text) => {
        const useCurated = (footer: string | null = null) => {
          this.researchCuratedBullets = [...DoctorDashboardComponent.RESEARCH_CURATED_DEFAULT];
          this.researchNewsFooterNote = footer;
        };

        if (text === '__NETWORK_ERROR__') {
          useCurated('We couldn’t load the latest headlines. The reminders below are still available.');
          return;
        }
        const t = (text || '').trim();
        if (!t) {
          useCurated(null);
          return;
        }
        if (t.startsWith('{')) {
          try {
            const j = JSON.parse(t) as { status?: string; message?: string };
            if (j.status === 'error' || /not configured|NEWS_API_KEY/i.test(String(j.message || ''))) {
              useCurated(null);
              return;
            }
          } catch {
            /* treat as non-JSON text below */
          }
        }
        this.researchNewsPreview = t.length > 800 ? `${t.slice(0, 800)}…` : t;
      });
  }


  loadDoctorPatients(): void {
    if (!this.doctorId) {
      this.toastService.error('Doctor ID not found', 'Error');
      return;
    }

    this.loadingPatients = true;
    this.patientProfilesByUserId = {};
    this.patientIdsMissingProfile.clear();
    forkJoin([
      this.careTeamService.getDoctorPatients(this.doctorId).pipe(catchError(() => of([]))),
      this.careTeamService.getDoctorPatients('11111111-1111-1111-1111-111111111111').pipe(catchError(() => of([])))
    ])
      .pipe(
        map(([res1, res2]) => [...res1, ...res2]),
        switchMap((assignments) => {
          const active = assignments.filter((a) => a.status === DoctorAssignmentStatus.ACTIVE);
          const ids = [...new Set(active.map((a) => a.patientId))];
          if (ids.length === 0) {
            return of({
              active,
              rows: [] as { id: string; profile: PatientProfileResponse | null }[]
            });
          }
          return forkJoin(
            ids.map((id) =>
              this.patientService.getPatientById(id).pipe(
                map((profile) => ({ id, profile })),
                catchError(() => of({ id, profile: null as PatientProfileResponse | null }))
              )
            )
          ).pipe(map((rows) => ({ active, rows })));
        })
      )
      .subscribe({
        next: ({ active, rows }) => {
          this.patientProfilesByUserId = {};
          this.patientIdsMissingProfile.clear();
          for (const row of rows) {
            if (row.profile?.firstName != null || row.profile?.lastName != null) {
              this.patientProfilesByUserId[row.id] = {
                firstName: row.profile.firstName || '',
                lastName: row.profile.lastName || ''
              };
            } else {
              this.patientIdsMissingProfile.add(row.id);
            }
          }
          const hasDirectoryProfile = (patientId: string): boolean => {
            const p = this.patientProfilesByUserId[patientId];
            return !!(p && (p.firstName?.trim() || p.lastName?.trim()));
          };
          // Stale care-team rows (deleted Keycloak/identity users, API tests) must not appear
          this.doctorAssignments = active.filter((a) => hasDirectoryProfile(a.patientId));
          if (!this.selectedAutonomyPatientId && this.doctorAssignments.length > 0) {
            this.selectedAutonomyPatientId = this.doctorAssignments[0].patientId;
            this.loadAutonomySuggestions();
          }
          this.loadingPatients = false;
        },
        error: (error) => {
          console.error('Error loading doctor patients:', error);
          this.toastService.error('Failed to load your patients', 'Error');
          this.doctorAssignments = [];
          this.loadingPatients = false;
        }
      });
  }

  loadAutonomySuggestions(): void {
    if (!this.selectedAutonomyPatientId) {
      this.autonomySuggestions = [];
      return;
    }
    this.loadingAutonomy = true;
    this.dailyCareService.getAutonomySuggestions(this.selectedAutonomyPatientId).subscribe({
      next: (items) => {
        this.autonomySuggestions = items || [];
        this.loadingAutonomy = false;
      },
      error: (err) => {
        console.error('Failed loading autonomy suggestions:', err);
        this.autonomySuggestions = [];
        this.loadingAutonomy = false;
      }
    });
  }

  approveAutonomySuggestion(suggestion: AutonomySuggestion): void {
    const payload: AutonomySuggestionDecisionRequest = {
      reviewNotes: this.autonomyReviewNote || 'Approved by doctor'
    };
    this.loadingAutonomy = true;
    this.dailyCareService.approveAutonomySuggestion(suggestion.id, payload).subscribe({
      next: () => {
        this.autonomyReviewNote = '';
        this.toastService.success('Autonomy suggestion approved');
        this.loadAutonomySuggestions();
      },
      error: (err) => {
        console.error('Failed to approve autonomy suggestion:', err);
        this.loadingAutonomy = false;
        this.toastService.error('Failed to approve suggestion');
      }
    });
  }

  rejectAutonomySuggestion(suggestion: AutonomySuggestion): void {
    const payload: AutonomySuggestionDecisionRequest = {
      reviewNotes: this.autonomyReviewNote || 'Rejected by doctor'
    };
    this.loadingAutonomy = true;
    this.dailyCareService.rejectAutonomySuggestion(suggestion.id, payload).subscribe({
      next: () => {
        this.autonomyReviewNote = '';
        this.toastService.warning('Autonomy suggestion rejected');
        this.loadAutonomySuggestions();
      },
      error: (err) => {
        console.error('Failed to reject autonomy suggestion:', err);
        this.loadingAutonomy = false;
        this.toastService.error('Failed to reject suggestion');
      }
    });
  }

  requestDownloadAutonomyReport(suggestion: AutonomySuggestion): void {
    this.pendingReportSuggestion = suggestion;
    this.showSignatureModal = true;
    setTimeout(() => this.initializeSignatureCanvas(), 0);
  }

  cancelSignatureModal(): void {
    this.showSignatureModal = false;
    this.pendingReportSuggestion = null;
  }

  clearSignatureCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  startSignature(event: MouseEvent | TouchEvent): void {
    const point = this.getCanvasPoint(event);
    if (!point) {
      return;
    }
    this.isDrawingSignature = true;
    this.signatureLastX = point.x;
    this.signatureLastY = point.y;
  }

  moveSignature(event: MouseEvent | TouchEvent): void {
    if (!this.isDrawingSignature) {
      return;
    }
    const canvas = this.signatureCanvas?.nativeElement;
    const point = this.getCanvasPoint(event);
    if (!canvas || !point) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(this.signatureLastX, this.signatureLastY);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    this.signatureLastX = point.x;
    this.signatureLastY = point.y;
  }

  endSignature(): void {
    this.isDrawingSignature = false;
  }

  confirmSignatureAndDownload(): void {
    if (!this.pendingReportSuggestion) {
      return;
    }
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const signatureImage = canvas.toDataURL('image/png');
    this.downloadAutonomyReport(this.pendingReportSuggestion, signatureImage, this.doctorName || '');
    this.showSignatureModal = false;
    this.pendingReportSuggestion = null;
  }

  downloadAutonomyReport(suggestion: AutonomySuggestion, signatureImage?: string, doctorName?: string): void {
    const patientName = this.resolveSelectedPatientName(suggestion.patientId);
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const marginX = 50;
    let y = 60;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('Autonomy Assessment Report', marginX, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Patient: ${patientName}`, marginX, y);
    y += 16;
    doc.text(`Patient ID: ${suggestion.patientId}`, marginX, y);
    y += 16;
    doc.text(`Generated At: ${new Date(suggestion.createdAt).toLocaleString()}`, marginX, y);
    y += 16;
    doc.text(`Status: ${suggestion.status}`, marginX, y);
    y += 24;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Recommended Levels', marginX, y);
    y += 18;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Mobility: ${suggestion.mobilityLevel}`, marginX, y); y += 14;
    doc.text(`Hygiene: ${suggestion.hygieneLevel}`, marginX, y); y += 14;
    doc.text(`Medication: ${suggestion.medicationLevel}`, marginX, y); y += 14;
    doc.text(`Decision Making: ${suggestion.decisionMakingLevel}`, marginX, y); y += 22;

    doc.setFont('helvetica', 'bold');
    doc.text('Clinical Notes', marginX, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    const summary = suggestion.aiSummary || 'No AI summary available.';
    const summaryLines = doc.splitTextToSize(summary, 500);
    doc.text(summaryLines, marginX, y);
    y += summaryLines.length * 14 + 10;

    const reasonText =
      `Mobility reason: ${suggestion.mobilityReason || '-'}\n` +
      `Hygiene reason: ${suggestion.hygieneReason || '-'}\n` +
      `Medication reason: ${suggestion.medicationReason || '-'}\n` +
      `Decision reason: ${suggestion.decisionMakingReason || '-'}`;
    const reasonLines = doc.splitTextToSize(reasonText, 500);
    doc.text(reasonLines, marginX, y);
    y += reasonLines.length * 14 + 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Doctor Review', marginX, y);
    y += 16;
    doc.setFont('helvetica', 'normal');
    const reviewer = doctorName?.trim() || suggestion.reviewedBy || 'Pending';
    doc.text(`Reviewed By: ${reviewer}`, marginX, y); y += 14;
    doc.text(`Reviewed At: ${suggestion.reviewedAt ? new Date(suggestion.reviewedAt).toLocaleString() : 'Pending'}`, marginX, y); y += 14;
    const reviewNote = suggestion.reviewNotes || 'No review note.';
    const reviewLines = doc.splitTextToSize(`Review note: ${reviewNote}`, 500);
    doc.text(reviewLines, marginX, y);
    y += reviewLines.length * 14 + 16;

    if (signatureImage) {
      doc.setFont('helvetica', 'bold');
      doc.text('Doctor Signature', marginX, y);
      y += 8;
      doc.addImage(signatureImage, 'PNG', marginX, y, 180, 70);
    }

    const fileSafeName = patientName.replace(/[^a-zA-Z0-9-_]/g, '_');
    doc.save(`autonomy-report-${fileSafeName}-${suggestion.id}.pdf`);
  }

  private resolveSelectedPatientName(patientId: string): string {
    const assignment = this.doctorAssignments.find(a => a.patientId === patientId);
    if (!assignment) {
      return `Patient_${patientId}`;
    }
    return this.getPatientFullName(assignment);
  }

  private initializeSignatureCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#e5e7eb';
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }

  private getCanvasPoint(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    if (event instanceof MouseEvent) {
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
    if (event.touches.length > 0) {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
    return null;
  }

  get patientCount(): number {
    return this.doctorAssignments.length;
  }

  getPatientFullName(assignment: DoctorAssignment): string {
    const prof = this.patientProfilesByUserId[assignment.patientId];
    if (prof) {
      const full = `${prof.firstName || ''} ${prof.lastName || ''}`.trim();
      if (full.length > 0) return full;
    }
    if (assignment.patientFirstName && assignment.patientLastName) {
      return `${assignment.patientFirstName} ${assignment.patientLastName}`;
    }
    if (assignment.patientFirstName) {
      return assignment.patientFirstName;
    }
    if (this.patientIdsMissingProfile.has(assignment.patientId)) {
      const id = assignment.patientId;
      const short = id.length > 10 ? `${id.slice(0, 8)}…` : id;
      return `Not in patient directory (${short})`;
    }
    return `Patient #${assignment.patientId}`;
  }

  /** Avatar letter when we have a real first name */
  getPatientAvatarLetter(assignment: DoctorAssignment): string {
    const prof = this.patientProfilesByUserId[assignment.patientId];
    if (prof?.firstName?.length) return prof.firstName.charAt(0).toUpperCase();
    if (assignment.patientFirstName?.length) {
      return assignment.patientFirstName.charAt(0).toUpperCase();
    }
    return '?';
  }

  getStatusClass(status: DoctorAssignmentStatus): string {
    switch (status) {
      case DoctorAssignmentStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case DoctorAssignmentStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  getPatientName(patientId: string): string {
    const patient = this.patients.find(p => p.id === patientId);
    return patient ? patient.name : 'Unknown';
  }

  openCreatePatientModal(): void {
    this.lastGeneratedPatientPassword = null;
    this.showCreatePatientModal = true;
  }

  closeCreatePatientModal(): void {
    this.showCreatePatientModal = false;
    this.creatingPatient = false;
  }

  submitCreatePatient(): void {
    if (!this.doctorId || this.createPatientForm.invalid) {
      this.toastService.warning('Please fill all required fields');
      return;
    }
    const v = this.createPatientForm.value;
    this.creatingPatient = true;
    this.lastGeneratedPatientPassword = null;
    this.doctorWorkflow
      .createPatientAsDoctor(this.doctorId, {
        username: v.username,
        email: v.email,
        password: v.password || undefined,
        firstName: v.firstName,
        lastName: v.lastName,
        dateOfBirth: v.dateOfBirth,
        gender: v.gender,
        phone: v.phone || undefined,
        address: v.address || undefined,
        emergencyContact: v.emergencyContact || undefined,
        diagnosisStage: v.diagnosisStage || undefined,
        emailVerified: true
      })
      .subscribe({
        next: (res) => {
          this.toastService.success('Patient created and assigned to you (PDF workflow)');
          if (res.generatedPassword) {
            this.lastGeneratedPatientPassword = res.generatedPassword;
            this.toastService.info('A temporary password was generated — copy it from the modal.', 'Password');
          }
          this.creatingPatient = false;
          this.loadDoctorPatients();
        },
        error: (err) => {
          const msg =
            err.error?.detail ||
            err.error?.message ||
            (typeof err.error === 'string' ? err.error : null) ||
            'Could not create patient';
          this.toastService.error(msg);
          this.creatingPatient = false;
        }
      });
  }
}


