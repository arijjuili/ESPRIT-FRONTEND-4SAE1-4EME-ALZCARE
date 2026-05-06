import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DailyCareService } from './daily-care.service';

describe('DailyCareService', () => {
  let service: DailyCareService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DailyCareService]
    });

    service = TestBed.inject(DailyCareService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ==================== HABIT METHODS ====================

  it('should get all habits', (done) => {
    service.getAllHabits().subscribe(habits => {
      expect(habits.length).toBe(1);
      expect(habits[0].name).toBe('Exercise');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit'));
    req.flush([{ id: 1, name: 'Exercise', description: 'Daily walk', active: true }]);
  });

  it('should not overwrite cache when backend returns empty but cache exists', (done) => {
    localStorage.setItem('mockAllHabits', JSON.stringify([{ id: 2, name: 'Cached', description: '', active: true }]));
    service.getAllHabits().subscribe(habits => {
      expect(habits.length).toBe(0);
      const cached = JSON.parse(localStorage.getItem('mockAllHabits') || '[]');
      expect(cached[0].name).toBe('Cached');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit'));
    req.flush([]);
  });

  it('should fallback to cached habits on error', (done) => {
    localStorage.setItem('mockAllHabits', JSON.stringify([{ id: 2, name: 'Cached', description: '', active: true }]));
    service.getAllHabits().subscribe(habits => {
      expect(habits.length).toBe(1);
      expect(habits[0].name).toBe('Cached');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit'));
    req.flush('Error', { status: 500, statusText: 'Server Error' });
  });

  it('should create habit', (done) => {
    const payload = { name: 'New Habit', type: 'PHYSICAL' as any, targetTime: '08:00', active: true };
    service.createHabit(payload).subscribe(habit => {
      expect(habit.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit'));
    req.flush({ id: 1, name: 'New Habit' });
  });

  it('should update habit', (done) => {
    service.updateHabit(1, { name: 'Updated', type: 'PHYSICAL' as any, targetTime: '08:00', active: true }).subscribe(habit => {
      expect(habit.name).toBe('Updated');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit/1'));
    req.flush({ id: 1, name: 'Updated' });
  });

  it('should delete habit', (done) => {
    service.deleteHabit(1).subscribe(() => {
      expect(true).toBeTrue();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit/1'));
    req.flush(null);
  });

  it('should toggle habit active', (done) => {
    service.toggleHabitActive(1, false).subscribe(habit => {
      expect(habit.active).toBeFalse();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit/1/active'));
    req.flush({ id: 1, active: false });
  });

  // ==================== TASK METHODS ====================

  it('should create task', (done) => {
    service.createTask({ title: 'Task 1', description: 'Desc', habitId: 1, orderIndex: 1, critical: false, autonomyMode: 'ASSISTED' as any }).subscribe(task => {
      expect(task.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit-task'));
    req.flush({ id: 1, description: 'Task 1' });
  });

  it('should update task', (done) => {
    service.updateTask(1, { title: 'Updated', description: 'Updated', habitId: 1, orderIndex: 1, critical: false, autonomyMode: 'ASSISTED' as any }).subscribe(task => {
      expect(task.description).toBe('Updated');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit-task/1'));
    req.flush({ id: 1, description: 'Updated' });
  });

  it('should delete task', (done) => {
    service.deleteTask(1).subscribe(() => {
      expect(true).toBeTrue();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit-task/1'));
    req.flush(null);
  });

  it('should complete task', (done) => {
    service.completeTask(1).subscribe(() => {
      expect(true).toBeTrue();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/completions/task/1'));
    req.flush({});
  });

  // ==================== ASSIGNMENT METHODS ====================

  it('should assign habit to patient', (done) => {
    service.assignHabitToPatient('doc-1', 'p1', { habitId: 1 }).subscribe(() => {
      const stored = JSON.parse(localStorage.getItem('mockHabitAssignments') || '{}');
      expect(stored['p1']).toContain(1);
      done();
    });
  });

  it('should unassign habit from patient', (done) => {
    service.assignHabitToPatient('doc-1', 'p1', { habitId: 1 }).subscribe(() => {
      service.unassignHabitFromPatient('doc-1', 'p1', 1).subscribe(() => {
        const stored = JSON.parse(localStorage.getItem('mockHabitAssignments') || '{}');
        expect(stored['p1'] || []).not.toContain(1);
        done();
      });
    });
  });

  it('should get assigned habits for patient', (done) => {
    service.assignHabitToPatient('doc-1', 'p1', { habitId: 1 }).subscribe(() => {
      service.getAssignedHabitsForPatient('p1').subscribe(habits => {
        expect(habits.length).toBe(1);
        expect(habits[0].id).toBe(1);
        done();
      });

      const req = httpMock.expectOne((r) => r.url.includes('/v1/habit'));
      req.flush([{ id: 1, name: 'Exercise', description: '', active: true }]);
    });
  });

  it('should fallback to all habits when no assignments match', (done) => {
    service.getAssignedHabitsForPatient('p1', true).subscribe(habits => {
      expect(habits.length).toBeGreaterThan(0);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/habit'));
    req.flush([{ id: 1, name: 'Exercise', description: '', active: true }]);
  });

  // ==================== AUTONOMY METHODS ====================

  it('should generate autonomy suggestion', (done) => {
    service.generateAutonomySuggestion('p1', 'notes').subscribe(suggestion => {
      expect(suggestion.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/autonomy/p1/suggest'));
    req.flush({ id: 1, suggestionText: 'Test' });
  });

  it('should get autonomy profile', (done) => {
    service.getAutonomyProfile('p1').subscribe(profile => {
      expect(profile).toBeTruthy();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/autonomy/p1'));
    req.flush({ patientId: 'p1', currentLevel: 'ASSISTED' });
  });

  it('should get autonomy suggestions', (done) => {
    service.getAutonomySuggestions('p1').subscribe(suggestions => {
      expect(suggestions.length).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/autonomy/p1/suggestions'));
    req.flush([{ id: 1 }]);
  });

  it('should get autonomy history', (done) => {
    service.getAutonomyHistory('p1').subscribe(history => {
      expect(history.length).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/autonomy/p1/history'));
    req.flush([{ id: 1 }]);
  });

  it('should submit autonomy suggestion', (done) => {
    service.submitAutonomySuggestion(1).subscribe(suggestion => {
      expect(suggestion.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/autonomy/suggestions/1/submit'));
    req.flush({ id: 1, status: 'SUBMITTED' });
  });

  it('should approve autonomy suggestion', (done) => {
    service.approveAutonomySuggestion(1, { reviewNotes: 'Approved' }).subscribe(suggestion => {
      expect(suggestion.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/autonomy/suggestions/1/approve'));
    req.flush({ id: 1, status: 'APPROVED' });
  });

  it('should reject autonomy suggestion', (done) => {
    service.rejectAutonomySuggestion(1, { reviewNotes: 'Rejected' }).subscribe(suggestion => {
      expect(suggestion.id).toBe(1);
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/autonomy/suggestions/1/reject'));
    req.flush({ id: 1, status: 'REJECTED' });
  });

  it('should get doctor stats', (done) => {
    service.getDoctorStats('doc-1').subscribe(stats => {
      expect(stats).toBeTruthy();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/v1/daily-care/stats/doctor'));
    expect(req.request.params.get('doctorId')).toBe('doc-1');
    req.flush({ totalHabits: 5 });
  });

  // ==================== ROUTINE STUBS ====================

  it('should get routines from storage', (done) => {
    localStorage.setItem('mockDailyRoutines', JSON.stringify([{ id: 'r1', name: 'Morning', active: true }]));
    service.getRoutines().subscribe(routines => {
      expect(routines.length).toBe(1);
      done();
    });
  });

  it('should toggle routine status', (done) => {
    localStorage.setItem('mockDailyRoutines', JSON.stringify([{ id: 'r1', name: 'Morning', active: true }]));
    service.toggleRoutineStatus('r1').subscribe(routine => {
      expect(routine.active).toBeFalse();
      done();
    });
  });

  it('should get patient daily tasks', (done) => {
    service.getPatientDailyTasks('p1').subscribe(tasks => {
      expect(tasks).toEqual([]);
      done();
    });
  });

  it('should update task status', (done) => {
    localStorage.setItem('mockDailyCareTasks', JSON.stringify([{ id: 't1', title: 'Task', completed: false, patientId: 'p1' }]));
    service.updateTaskStatus('t1', { completed: true }).subscribe(task => {
      expect(task.completed).toBeTrue();
      done();
    });
  });
});
