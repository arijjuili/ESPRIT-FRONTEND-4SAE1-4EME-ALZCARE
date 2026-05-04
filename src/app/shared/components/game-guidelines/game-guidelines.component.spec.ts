import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameGuidelinesComponent } from './game-guidelines.component';

describe('GameGuidelinesComponent', () => {
  let component: GameGuidelinesComponent;
  let fixture: ComponentFixture<GameGuidelinesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameGuidelinesComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GameGuidelinesComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show highlight after init', fakeAsync(() => {
    component.ngOnInit();
    expect(component.showHighlight).toBeFalse();
    tick(300);
    expect(component.showHighlight).toBeTrue();
  }));

  it('should emit close event after closing guidelines', fakeAsync(() => {
    spyOn(component.close, 'emit');
    component.closeGuidelines();
    expect(component.showHighlight).toBeFalse();
    tick(300);
    expect(component.visible).toBeFalse();
    expect(component.close.emit).toHaveBeenCalled();
  }));

  it('should accept custom title and steps', () => {
    component.title = 'Memory Match Rules';
    component.steps = [
      { title: 'Step 1', description: 'Flip a card', icon: '👆' },
      { title: 'Step 2', description: 'Find the match', icon: '✅' }
    ];
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Memory Match Rules');
    expect(compiled.textContent).toContain('Flip a card');
  });
});
