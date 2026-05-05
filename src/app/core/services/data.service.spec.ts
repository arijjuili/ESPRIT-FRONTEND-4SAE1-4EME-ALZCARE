import { TestBed } from '@angular/core/testing';
import { DataService } from './data.service';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return all patients', () => {
    const patients = service.getPatients();
    expect(patients.length).toBe(2);
    expect(patients[0].name).toBe('Margaret Johnson');
  });

  it('should find patient by id', () => {
    const patient = service.getPatientById('p1');
    expect(patient).toBeTruthy();
    expect(patient?.name).toBe('Margaret Johnson');
  });

  it('should return undefined for unknown patient', () => {
    const patient = service.getPatientById('unknown');
    expect(patient).toBeUndefined();
  });

  it('should return all appointments', () => {
    const appointments = service.getAppointments();
    expect(appointments.length).toBeGreaterThan(0);
  });

  it('should filter appointments by patient', () => {
    const appointments = service.getAppointments('p1');
    expect(appointments.every(a => a.patientId === 'p1')).toBeTrue();
  });

  it('should return all tasks', () => {
    const tasks = service.getTasks();
    expect(tasks.length).toBeGreaterThan(0);
  });

  it('should filter tasks by patient and assignee', () => {
    const tasks = service.getTasks('p1', '2');
    expect(tasks.every(t => t.patientId === 'p1' && t.assignedTo === '2')).toBeTrue();
  });

  it('should return health metrics for patient', () => {
    const metrics = service.getHealthMetrics('p1');
    expect(metrics.length).toBeGreaterThan(0);
    expect(metrics.every(m => m.patientId === 'p1')).toBeTrue();
  });

  it('should return tasks for caregiver', () => {
    const tasks = service.getTasksForCaregiver('2');
    expect(tasks.every(t => t.assignedTo === '2')).toBeTrue();
  });

  it('should update task status', () => {
    const task = service.getTasks()[0];
    const originalStatus = task.completed;
    service.updateTaskStatus(task.id, !originalStatus);
    expect(task.completed).toBe(!originalStatus);
  });
});
