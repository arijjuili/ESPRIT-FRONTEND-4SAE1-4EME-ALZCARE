import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CareTeamService } from './care-team.service';

describe('CareTeamService', () => {
  let service: CareTeamService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CareTeamService]
    });

    service = TestBed.inject(CareTeamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // === Caregiver Assignment Methods ===

  it('should generate caregiver invite', () => {
    service.generateCaregiverInvite({ patientId: 'p1', role: 'PRIMARY' as any }).subscribe((response: any) => {
      expect(response.inviteToken).toBe('token-123');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/generate-invite'));
    req.flush({ assignmentId: 'a1', inviteToken: 'token-123', inviteUrl: 'http://test', expiresAt: '2024-01-01', patientId: 'p1', role: 'PRIMARY' });
  });

  it('should validate invite token', () => {
    service.validateInviteToken('token-123').subscribe((result: any) => {
      expect(result.valid).toBeTrue();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/invitations/token-123/validate'));
    req.flush({ valid: true, patientName: 'John', role: 'PRIMARY' });
  });

  it('should accept invite', () => {
    service.acceptInvite('token-123', 'cg-1').subscribe((result: any) => {
      expect(result.id).toBe('a1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/invitations/token-123/accept'));
    req.flush({ id: 'a1', patientId: 'p1', caregiverId: 'cg-1', role: 'PRIMARY', status: 'ACTIVE' });
  });

  it('should get patient caregivers', () => {
    service.getPatientCaregivers('p1').subscribe((caregivers: any) => {
      expect(caregivers.length).toBe(1);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/patients/p1/caregivers'));
    req.flush([{ id: 'a1', patientId: 'p1', caregiverId: 'cg-1' }]);
  });

  it('should get caregiver assignments', () => {
    service.getCaregiverAssignments('cg-1').subscribe((assignments: any) => {
      expect(assignments.length).toBe(1);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/cg-1/assignments'));
    req.flush([{ id: 'a1' }]);
  });

  it('should change caregiver role', () => {
    service.changeCaregiverRole('a1', { role: 'FAMILY' as any }).subscribe((result: any) => {
      expect(result.role).toBe('FAMILY');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/assignments/a1/role'));
    req.flush({ id: 'a1', role: 'FAMILY' });
  });

  it('should revoke caregiver access', () => {
    service.revokeCaregiverAccess('a1').subscribe(() => {
      expect(true).toBeTrue();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/assignments/a1'));
    req.flush(null);
  });

  it('should mark caregiver unavailable', () => {
    service.markCaregiverUnavailable('a1', { from: '2024-01-01', to: '2024-01-02', reason: 'Vacation' }).subscribe((result: any) => {
      expect(result.id).toBe('a1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/assignments/a1/availability'));
    req.flush({ id: 'a1' });
  });

  it('should get caregiver permissions', () => {
    service.getCaregiverPermissions('cg-1', 'p1').subscribe((perms: any) => {
      expect(perms).toBeTruthy();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/cg-1/permissions'));
    expect(req.request.params.get('patientId')).toBe('p1');
    req.flush({ canViewMedical: true });
  });

  it('should get caregiver availability', () => {
    service.getCaregiverAvailability('cg-1').subscribe((slots: any) => {
      expect(slots.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/cg-1/availability'));
    req.flush([]);
  });

  // === Doctor Assignment Methods ===

  it('should assign doctor to patient', () => {
    service.assignDoctorToPatient('doc-1', { patientId: 'p1' }).subscribe((result: any) => {
      expect(result.id).toBe('d1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/doctors/doc-1/patients/create'));
    req.flush({ id: 'd1' });
  });

  it('should get doctor patients', () => {
    service.getDoctorPatients('doc-1').subscribe((patients: any) => {
      expect(patients.length).toBe(1);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/doctors/doc-1/patients'));
    req.flush([{ id: 'd1' }]);
  });

  it('should get patient doctor', () => {
    service.getPatientDoctor('p1').subscribe((doctor: any) => {
      expect(doctor.id).toBe('d1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/patients/p1/doctor'));
    req.flush({ id: 'd1' });
  });

  it('should return null for patient doctor 404', () => {
    service.getPatientDoctor('p1').subscribe((doctor: any) => {
      expect(doctor).toBeNull();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/patients/p1/doctor'));
    req.flush('Not found', { status: 404, statusText: 'Not Found' });
  });

  it('should deactivate doctor assignment', () => {
    service.deactivateDoctorAssignment('d1').subscribe((result: any) => {
      expect(result.id).toBe('d1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/doctor-assignments/d1/deactivate'));
    req.flush({ id: 'd1' });
  });

  it('should update patient care profile', () => {
    service.updatePatientCareProfile('p1', { notes: 'Test' } as any).subscribe((result: any) => {
      expect(result).toBeTruthy();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/patients/p1'));
    req.flush({ emergencyContact: 'Test' });
  });

  it('should get patient care profile', () => {
    service.getPatientCareProfile('p1').subscribe((profile: any) => {
      expect(profile).toBeTruthy();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/patients/p1/care-profile'));
    req.flush({});
  });

  it('should get patient handovers by patient path', () => {
    service.getPatientHandoversByPatientPath('p1').subscribe((handovers: any) => {
      expect(handovers.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/patients/p1/handovers'));
    req.flush([]);
  });

  it('should get routing travel time', () => {
    service.routingTravelTime(0, 0, 1, 1).subscribe((result: any) => {
      expect(result).toBeTruthy();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/routing/travel-time'));
    expect(req.request.params.get('originLat')).toBe('0');
    req.flush({});
  });

  it('should search rx norm', () => {
    service.rxNormSearch('aspirin').subscribe((result: any) => {
      expect(result).toBe('data');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/integrations/rxnorm/search'));
    req.flush('data');
  });

  it('should get air quality', () => {
    service.airQualityNearest(0, 0).subscribe((result: any) => {
      expect(result).toBe('data');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/integrations/air-quality'));
    req.flush('data');
  });

  it('should get research news', () => {
    service.researchNews().subscribe((result: any) => {
      expect(result).toBe('data');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/integrations/research-news'));
    req.flush('data');
  });

  // === Checklist Methods ===

  it('should create checklist item', () => {
    service.createChecklistItem({ description: 'Desc', patientId: 'p1', doctorId: 'doc-1', date: '2024-01-01', priority: 'MEDIUM' as any, itemOrder: 1, category: 'GENERAL' as any }).subscribe((item: any) => {
      expect(item.id).toBe('c1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/items'));
    req.flush({ id: 'c1' });
  });

  it('should get checklist item', () => {
    service.getChecklistItem('c1').subscribe((item: any) => {
      expect(item.id).toBe('c1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/items/c1'));
    req.flush({ id: 'c1' });
  });

  it('should get doctor checklist items', () => {
    service.getDoctorChecklistItems('doc-1').subscribe((items: any) => {
      expect(items.length).toBe(1);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/doctor/doc-1'));
    req.flush([{ id: 'c1' }]);
  });

  it('should get patient checklist without doctorId', () => {
    service.getPatientChecklist('p1', '2024-01-01').subscribe((items: any) => {
      expect(items.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/patient/p1/date/2024-01-01'));
    req.flush([]);
  });

  it('should get patient checklist with doctorId', () => {
    service.getPatientChecklist('p1', '2024-01-01', 'doc-1').subscribe((items: any) => {
      expect(items.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/patient/p1/date/2024-01-01'));
    expect(req.request.params.get('doctorId')).toBe('doc-1');
    req.flush([]);
  });

  it('should generate daily checklist', () => {
    service.generateDailyChecklist({ doctorId: 'doc-1', patientId: 'p1', date: '2024-01-01' }).subscribe((items: any) => {
      expect(items.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/generate'));
    req.flush([]);
  });

  it('should get doctor checklists grouped', () => {
    service.getDoctorChecklistsGrouped('doc-1').subscribe((groups: any) => {
      expect(groups.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/doctor/doc-1/grouped'));
    req.flush([]);
  });

  it('should complete checklist item', () => {
    service.completeChecklistItem('c1', { completedBy: 'cg-1' }).subscribe((item: any) => {
      expect(item.id).toBe('c1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/items/c1/complete'));
    req.flush({ id: 'c1' });
  });

  it('should assign checklist item', () => {
    service.assignChecklistItem('c1', { caregiverId: 'cg-1' }).subscribe((item: any) => {
      expect(item.id).toBe('c1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/items/c1/assign'));
    req.flush({ id: 'c1' });
  });

  it('should delete checklist item', () => {
    service.deleteChecklistItem('c1').subscribe(() => {
      expect(true).toBeTrue();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/items/c1'));
    req.flush(null);
  });

  // === Handover Methods ===

  it('should create handover', () => {
    service.createHandover({ patientId: 'p1', fromCaregiverId: 'cg-1', toCaregiverId: 'cg-2', notes: 'Test' }).subscribe((handover: any) => {
      expect(handover.id).toBe('h1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/handover'));
    req.flush({ id: 'h1' });
  });

  it('should acknowledge handover', () => {
    service.acknowledgeHandover('h1').subscribe((handover: any) => {
      expect(handover.id).toBe('h1');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/handover/h1/acknowledge'));
    req.flush({ id: 'h1' });
  });

  it('should get patient handovers', () => {
    service.getPatientHandovers('p1').subscribe((handovers: any) => {
      expect(handovers.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/patients/p1/handovers'));
    req.flush([]);
  });

  // === Stats/Utility Methods ===

  it('should get care team stats', () => {
    service.getCareTeamStats().subscribe((stats: any) => {
      expect(stats).toBeTruthy();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/stats'));
    req.flush({});
  });

  it('should get all caregiver assignments with filters', () => {
    service.getAllCaregiverAssignments({ patientId: 'p1', caregiverId: 'cg-1', role: 'PRIMARY' as any, active: true }).subscribe((assignments: any) => {
      expect(assignments.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/assignments'));
    expect(req.request.params.get('patientId')).toBe('p1');
    expect(req.request.params.get('caregiverId')).toBe('cg-1');
    expect(req.request.params.get('role')).toBe('PRIMARY');
    expect(req.request.params.get('active')).toBe('true');
    req.flush([]);
  });

  it('should get all doctor assignments with filters', () => {
    service.getAllDoctorAssignments({ doctorId: 'doc-1', patientId: 'p1', active: false }).subscribe((assignments: any) => {
      expect(assignments.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/doctors/assignments'));
    expect(req.request.params.get('doctorId')).toBe('doc-1');
    expect(req.request.params.get('patientId')).toBe('p1');
    expect(req.request.params.get('active')).toBe('false');
    req.flush([]);
  });

  it('should get checklist items with filters', () => {
    service.getChecklistItems({ patientId: 'p1', doctorId: 'doc-1', assignedTo: 'cg-1', date: '2024-01-01', completed: true }).subscribe((items: any) => {
      expect(items.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/checklists/items'));
    expect(req.request.params.get('patientId')).toBe('p1');
    expect(req.request.params.get('completed')).toBe('true');
    req.flush([]);
  });

  it('should get handovers with filters', () => {
    service.getHandovers({ patientId: 'p1', fromCaregiverId: 'cg-1', toCaregiverId: 'cg-2', acknowledged: true }).subscribe((handovers: any) => {
      expect(handovers.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/caregivers/handover'));
    expect(req.request.params.get('patientId')).toBe('p1');
    expect(req.request.params.get('acknowledged')).toBe('true');
    req.flush([]);
  });
});
