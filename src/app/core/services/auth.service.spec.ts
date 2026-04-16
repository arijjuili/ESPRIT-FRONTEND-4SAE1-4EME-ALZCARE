import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  // Mock localStorage
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};

    spyOn(localStorage, 'getItem').and.callFake((key: string) => store[key] || null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      store[key] = value;
    });
    spyOn(localStorage, 'removeItem').and.callFake((key: string) => {
      delete store[key];
    });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Mock Authentication', () => {
    beforeEach(() => {
      service.setUseKeycloak(false);
    });

    it('should login with valid mock credentials', (done) => {
      service.login('patient@example.com', 'Password123!').subscribe(user => {
        expect(user).toBeTruthy();
        expect(user.email).toBe('patient@example.com');
        expect(user.role).toBe('patient');
        expect(user.name).toBe('John Patient');
        expect(service.isAuthenticated()).toBeTrue();
        done();
      });
    });

    it('should fail login with invalid mock credentials', (done) => {
      service.login('wrong@example.com', 'wrongpassword').subscribe({
        error: (err) => {
          expect(err.message).toBe('Invalid credentials');
          expect(service.isAuthenticated()).toBeFalse();
          done();
        }
      });
    });

    it('should persist user to localStorage on mock login', (done) => {
      service.login('caregiver@example.com', 'Password123!').subscribe(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('currentUser', jasmine.any(String));
        expect(localStorage.setItem).toHaveBeenCalledWith('access_token', 'mock-caregiver-token');
        done();
      });
    });
  });

  describe('Token Utilities', () => {
    it('should return null when no token exists', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(service.getTokenExpirationTime()).toBeNull();
    });

    it('should get token expiration time from a valid JWT', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      // JWT header.payload.signature - payload contains exp
      const payload = btoa(JSON.stringify({ exp: futureExp })).replace(/=/g, '');
      const token = `header.${payload}.signature`;

      localStorage.setItem('access_token', token);
      expect(service.getTokenExpirationTime()).toBe(futureExp);
    });

    it('should detect token is not expired when valid', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ exp: futureExp })).replace(/=/g, '');
      const token = `header.${payload}.signature`;

      localStorage.setItem('access_token', token);
      expect(service.isTokenExpired()).toBeFalse();
      expect(service.isTokenExpiringSoon(3700)).toBeTrue();
      expect(service.isTokenExpiringSoon(60)).toBeFalse();
    });

    it('should return 0 time until expiry for expired token', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      const payload = btoa(JSON.stringify({ exp: pastExp })).replace(/=/g, '');
      const token = `header.${payload}.signature`;

      localStorage.setItem('access_token', token);
      expect(service.getTimeUntilExpiry()).toBe(0);
      expect(service.isTokenExpired()).toBeTrue();
    });
  });

  describe('Logout', () => {
    it('should clear user and localStorage on logout', (done) => {
      service.setUseKeycloak(false);
      service.login('admin@example.com', 'Password123!').subscribe(() => {
        expect(service.isAuthenticated()).toBeTrue();

        service.logout();

        expect(service.isAuthenticated()).toBeFalse();
        expect(service.getCurrentUser()).toBeNull();
        expect(localStorage.removeItem).toHaveBeenCalledWith('currentUser');
        expect(localStorage.removeItem).toHaveBeenCalledWith('access_token');
        expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
        done();
      });
    });
  });

  describe('Current User ID', () => {
    it('should return user id from current user when no token', (done) => {
      service.setUseKeycloak(false);
      service.login('patient@example.com', 'Password123!').subscribe(() => {
        expect(service.getCurrentUserId()).toBe('1');
        done();
      });
    });

    it('should return sub from JWT token when available', () => {
      const payload = btoa(JSON.stringify({ sub: 'keycloak-uuid-123' })).replace(/=/g, '');
      const token = `header.${payload}.signature`;
      localStorage.setItem('access_token', token);

      expect(service.getCurrentUserId()).toBe('keycloak-uuid-123');
    });
  });
});
