import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PatientGamesComponent } from './patient-games.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { PatientService } from '../../../core/services/patient.service';
import { SpeechCommandService } from '../../../core/services/speech-command.service';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GameCatalogItem, GameActivity, GamificationBadgeEvent } from '../../../core/models/api.model';

class MockRouter {
  navigate = jasmine.createSpy('navigate');
}

describe('PatientGamesComponent', () => {
  let component: PatientGamesComponent;
  let fixture: ComponentFixture<PatientGamesComponent>;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let speechServiceSpy: jasmine.SpyObj<SpeechCommandService>;

  beforeEach(async () => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', [
      'getGameCatalog', 'getGameActivities', 'getRecentBadges'
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);
    speechServiceSpy = jasmine.createSpyObj('SpeechCommandService', [
      'isSupported', 'startListening', 'stopListening'
    ]);

    await TestBed.configureTestingModule({
      imports: [PatientGamesComponent],
      providers: [
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: PatientService, useValue: {} },
        { provide: SpeechCommandService, useValue: speechServiceSpy },
        { provide: Router, useClass: MockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PatientGamesComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load catalog on init', () => {
    const catalog: GameCatalogItem[] = [
      { gameType: 'MEMORY_MATCH', name: 'Memory Match', description: '', durationMinutes: 8, difficulty: 'EASY', icon: '🧠' }
    ];
    apiServiceSpy.getGameCatalog.and.returnValue(of(catalog));
    apiServiceSpy.getGameActivities.and.returnValue(of([]));
    apiServiceSpy.getRecentBadges.and.returnValue(of([]));
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'user-1' } as any);

    component.ngOnInit();

    expect(component.games.length).toBe(1);
    expect(component.games[0].name).toBe('Memory Match');
    expect(component.loading).toBeFalse();
  });

  it('should handle catalog load error', () => {
    apiServiceSpy.getGameCatalog.and.returnValue(throwError(() => ({ error: { detail: 'Server error' } })));

    component.loadCatalog();

    expect(component.error).toBe('Server error');
    expect(component.loading).toBeFalse();
  });

  it('should navigate when playGame is called', () => {
    const router = TestBed.inject(Router) as unknown as MockRouter;
    component.games = [
      { gameType: 'MEMORY_MATCH', name: 'Memory Match', route: '/patient/games/memory-match', accent: '', glow: '', badge: '', recommendedDifficulty: 'EASY', description: '', durationMinutes: 8, difficulty: 'EASY', icon: '🧠' }
    ] as any;

    component.playGame(component.games[0]);

    expect(router.navigate).toHaveBeenCalledWith(['/patient/games/memory-match'], { queryParams: { difficulty: 'EASY' } });
  });

  it('should compute daily progress percent correctly', () => {
    component.todaySessions = 1;
    component.dailyTarget = 2;
    expect(component.dailyProgressPercent).toBe(50);

    component.todaySessions = 3;
    expect(component.dailyProgressPercent).toBe(100);
  });

  it('should detect badge image URL correctly', () => {
    expect(component.isBadgeImageUrl('https://example.com/badge.png')).toBeTrue();
    expect(component.isBadgeImageUrl('🏅')).toBeFalse();
    expect(component.isBadgeImageUrl(undefined)).toBeFalse();
  });

  it('should extract verifiable badge URL from description', () => {
    const badge: GamificationBadgeEvent = {
      patientId: 'p1',
      patientName: 'John',
      gameType: 'MEMORY_MATCH',
      badgeEarned: 'TEST',
      badgeDescription: 'Test badge | Verifiable: https://verify.com/b1',
      earnedAt: '2024-01-01T00:00:00Z'
    };
    expect(component.getVerifiableBadgeUrl(badge)).toBe('https://verify.com/b1');
  });

  it('should return fallback icon text for badges', () => {
    expect(component.getBadgeIconText('🏆')).toBe('🏆');
    expect(component.getBadgeIconText('https://example.com/img.png')).toBe('🏅');
    expect(component.getBadgeIconText(undefined)).toBe('🏅');
  });

  it('should compute recommendations based on accuracy', () => {
    const activities: GameActivity[] = [
      { id: '1', patientId: 'p1', gameType: 'MEMORY_MATCH', difficulty: 'EASY', targetDomain: 'memory', createdAt: '2024-01-01T00:00:00Z', accuracyPercent: 90, mistakesMade: 0 },
      { id: '2', patientId: 'p1', gameType: 'MEMORY_MATCH', difficulty: 'EASY', targetDomain: 'memory', createdAt: '2024-01-02T00:00:00Z', accuracyPercent: 95, mistakesMade: 0 }
    ] as any;

    const recs = (component as any).computeRecommendations(activities);
    expect(recs['MEMORY_MATCH']).toBe('HARD');
  });

  it('should toggle voice commands on and off', () => {
    speechServiceSpy.isSupported.and.returnValue(true);
    speechServiceSpy.startListening.and.returnValue(true);

    component.voiceSupported = true;
    component.toggleVoiceCommands();

    expect(component.voiceListening).toBeTrue();
    expect(component.voiceStatus).toContain('Listening');

    component.toggleVoiceCommands();

    expect(component.voiceListening).toBeFalse();
    expect(speechServiceSpy.stopListening).toHaveBeenCalled();
  });

  it('should handle voice command to open a game', () => {
    component.games = [
      { gameType: 'ATTENTION_TASK', name: 'Attention Task', route: '/patient/games/attention-task', accent: '', glow: '', badge: '', recommendedDifficulty: 'EASY', description: '', durationMinutes: 6, difficulty: 'EASY', icon: '⚡' }
    ] as any;
    const router = TestBed.inject(Router) as unknown as MockRouter;

    (component as any).handleVoiceCommand('attention');

    expect(router.navigate).toHaveBeenCalled();
    expect(component.voiceStatus).toContain('Attention Task');
  });

  it('should find game from voice command with levenshtein matching', () => {
    component.games = [
      { gameType: 'MEMORY_MATCH', name: 'Memory Match', route: '', accent: '', glow: '', badge: '', recommendedDifficulty: 'EASY', description: '', durationMinutes: 8, difficulty: 'EASY', icon: '🧠' }
    ] as any;

    const game = (component as any).findGameFromVoice('memry mtch');
    expect(game).toBeTruthy();
    expect(game?.gameType).toBe('MEMORY_MATCH');
  });

  it('should show badge popup when new badge arrives', fakeAsync(() => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'user-1' } as any);
    apiServiceSpy.getGameCatalog.and.returnValue(of([]));
    apiServiceSpy.getGameActivities.and.returnValue(of([]));
    apiServiceSpy.getRecentBadges.and.returnValue(of([{
      patientId: 'p1',
      patientName: 'John',
      gameType: 'MEMORY_MATCH',
      badgeEarned: 'DAILY_FOCUS',
      earnedAt: '2024-01-15T10:00:00Z'
    }]));

    localStorage.setItem('alzcare_seen_backend_badge_event', 'OTHER:2024-01-14T00:00:00Z');

    component.ngOnInit();
    tick();

    expect(component.showBadgePopup).toBeTrue();
    expect(component.latestEarnedBadge?.badgeEarned).toBe('DAILY_FOCUS');

    component.ngOnDestroy();
  }));

  it('should clear interval on destroy', () => {
    authServiceSpy.getCurrentUser.and.returnValue({ id: 'user-1' } as any);
    apiServiceSpy.getGameCatalog.and.returnValue(of([]));
    apiServiceSpy.getGameActivities.and.returnValue(of([]));
    apiServiceSpy.getRecentBadges.and.returnValue(of([]));
    spyOn(window, 'clearInterval');

    component.ngOnInit();
    const timer = component['badgeRefreshTimer'];
    component.ngOnDestroy();

    expect(window.clearInterval).toHaveBeenCalledWith(timer ?? jasmine.any(Number));
  });
});
