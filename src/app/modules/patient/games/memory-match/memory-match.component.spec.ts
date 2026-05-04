import { ComponentFixture, TestBed, fakeAsync, tick, flush, discardPeriodicTasks } from '@angular/core/testing';
import { MemoryMatchComponent } from './memory-match.component';
import { ApiService } from '../../../../core/services/api.service';
import { AuthService } from '../../../../core/services/auth.service';
import { of } from 'rxjs';
import { GameAdaptationProfile } from '../../../../core/models/api.model';
import { ActivatedRoute } from '@angular/router';

describe('MemoryMatchComponent', () => {
  let component: MemoryMatchComponent;
  let fixture: ComponentFixture<MemoryMatchComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getGameAdaptation', 'createGameActivity'
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

    await TestBed.configureTestingModule({
      imports: [MemoryMatchComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MemoryMatchComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize deck with pairs', () => {
    expect(component.deck.length).toBe(8); // 4 pairs for EASY
    const values = new Set(component.deck.map(c => c.value));
    expect(values.size).toBe(4);
  });

  it('should load adaptation profile on init', () => {
    const adaptation: GameAdaptationProfile = {
      patientId: 'p1',
      gameType: 'MEMORY_MATCH',
      recommendedDifficulty: 'MEDIUM',
      assistedMode: false,
      hintLevel: 1,
      timeMultiplier: 1,
      cueMode: 'none',
      breakSuggestion: false,
      reason: 'balanced performance'
    };
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'user-1' } as any);
    apiServiceSpy.getGameAdaptation.and.returnValue(of(adaptation));

    component.ngOnInit();

    expect(component.currentDifficulty).toBe('MEDIUM');
    expect(component.assistedMode).toBeTrue();
    expect(component.hintLevel).toBe(1);
  });

  it('should flip a card and track state', () => {
    const card = component.deck[0];
    expect(card.flipped).toBeFalse();

    component.flipCard(card);

    expect(card.flipped).toBeTrue();
    expect(component.moves).toBe(0);
  });

  it('should match two identical cards', () => {
    const pair = component.deck.filter(c => c.value === component.icons[0]);
    expect(pair.length).toBe(2);

    component.flipCard(pair[0]);
    component.flipCard(pair[1]);

    expect(pair[0].matched).toBeTrue();
    expect(pair[1].matched).toBeTrue();
    expect(component.matches).toBe(1);
    expect(component.busy).toBeFalse();
  });

  it('should flip back mismatched cards after delay', fakeAsync(() => {
    const cards = component.deck;
    const first = cards.find(c => c.value === component.icons[0])!;
    const second = cards.find(c => c.value === component.icons[1])!;

    component.flipCard(first);
    component.flipCard(second);

    expect(component.busy).toBeTrue();
    tick(700);

    expect(first.flipped).toBeFalse();
    expect(second.flipped).toBeFalse();
    expect(component.busy).toBeFalse();
    expect(component.moves).toBe(1);
    flush();
    discardPeriodicTasks();
  }));

  it('should not allow flipping more than 2 cards', () => {
    const first = component.deck[0];
    const second = component.deck.find(c => c.value !== first.value)!;
    component.flipCard(first);
    component.flipCard(second);

    // third flip should be ignored while busy
    expect(component.busy).toBeTrue();
    const third = component.deck.find(c => !c.flipped && c.id !== first.id && c.id !== second.id)!;
    component.flipCard(third);
    expect(third.flipped).toBeFalse();
  });

  it('should not flip already matched cards', () => {
    const pair = component.deck.filter(c => c.value === component.icons[0]);
    pair[0].matched = true;
    pair[1].matched = true;

    component.flipCard(pair[0]);
    expect(pair[0].flipped).toBeFalse();
  });

  it('should reset game and regenerate deck', () => {
    component.flipCard(component.deck[0]);
    component.resetGame();

    expect(component.deck.every(c => !c.flipped && !c.matched)).toBeTrue();
    expect(component.moves).toBe(0);
    expect(component.matches).toBe(0);
  });

  it('should resolve correct icon count by difficulty', () => {
    expect((component as any).resolveIconsByDifficulty('EASY').length).toBe(4);
    expect((component as any).resolveIconsByDifficulty('MEDIUM').length).toBe(6);
    expect((component as any).resolveIconsByDifficulty('HARD').length).toBe(8);
  });

  it('should compute complete getter correctly', () => {
    component.matches = 4; // EASY has 4 pairs
    expect(component.complete).toBeTrue();

    component.matches = 3;
    expect(component.complete).toBeFalse();
  });

  it('should record session to localStorage on completion', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'user-1' } as any);
    apiServiceSpy.getGameAdaptation.and.returnValue(of({} as any));
    apiServiceSpy.createGameActivity.and.returnValue(of({} as any));
    component.ngOnInit();

    // Simulate completing all matches
    const uniqueIcons = component.icons;
    uniqueIcons.forEach(icon => {
      const pair = component.deck.filter(c => c.value === icon);
      component.flipCard(pair[0]);
      component.flipCard(pair[1]);
    });

    const sessions = JSON.parse(localStorage.getItem('alzcare_game_sessions') || '[]');
    expect(sessions.length).toBeGreaterThan(0);
  });

  it('should clear visual timers on destroy', () => {
    component['visualTimers'] = [window.setTimeout(() => {}, 1000)];
    spyOn(window, 'clearTimeout');

    component.ngOnDestroy();

    expect(window.clearTimeout).toHaveBeenCalled();
  });

  it('should hide splash and show guidelines after splash completes', () => {
    component.onSplashComplete();
    expect(component.showSplash).toBeFalse();
    expect(component.showGuidelines).toBeTrue();
  });

  it('should hide guidelines when closed', () => {
    component.showGuidelines = true;
    component.onGuidelinesClose();
    expect(component.showGuidelines).toBeFalse();
  });
});
