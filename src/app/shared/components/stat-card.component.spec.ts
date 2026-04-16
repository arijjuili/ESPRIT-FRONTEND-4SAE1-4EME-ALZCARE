import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display label, value and icon', () => {
    component.label = 'Total Patients';
    component.value = 42;
    component.icon = '👤';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Total Patients');
    expect(compiled.textContent).toContain('42');
    expect(compiled.textContent).toContain('👤');
  });

  it('should show subtitle when provided', () => {
    component.label = 'Appointments';
    component.value = 5;
    component.subtitle = '+2 from yesterday';
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('+2 from yesterday');
  });

  it('should not show subtitle element when subtitle is empty', () => {
    component.label = 'Alerts';
    component.value = 0;
    component.subtitle = '';
    fixture.detectChanges();

    const subtitleEl = fixture.debugElement.query(By.css('p.text-sm'));
    expect(subtitleEl).toBeNull();
  });

  it('should apply correct border color class for primary', () => {
    component.color = 'primary';
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.css('div')).nativeElement as HTMLElement;
    expect(card.classList).toContain('border-primary-500');
  });

  it('should apply correct border color class for danger', () => {
    component.color = 'danger';
    fixture.detectChanges();

    const card = fixture.debugElement.query(By.css('div')).nativeElement as HTMLElement;
    expect(card.classList).toContain('border-danger');
  });

  it('should default to primary color', () => {
    fixture.detectChanges();
    expect(component.color).toBe('primary');
    expect(component.borderColorClass).toBe('border-primary-500');
  });
});
