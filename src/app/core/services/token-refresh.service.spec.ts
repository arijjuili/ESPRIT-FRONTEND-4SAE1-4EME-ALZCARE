import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TokenRefreshService } from './token-refresh.service';

describe('TokenRefreshService', () => {
  let service: TokenRefreshService;
  let httpMock: HttpTestingController;

  const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IlRlc3QiLCJleHAiOjk5OTk5OTk5OTl9.signature';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TokenRefreshService]
    });

    service = TestBed.inject(TokenRefreshService);
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

  // ==================== JWT DECODING ====================

  it('should get token expiration time', () => {
    const exp = service.getTokenExpirationTime(validToken);
    expect(exp).toBe(9999999999);
  });

  it('should throw for empty token', () => {
    expect(() => service.getTokenExpirationTime('')).toThrowError('Token is required');
  });

  it('should throw for invalid token format', () => {
    expect(() => service.getTokenExpirationTime('invalid')).toThrowError();
  });

  it('should throw for token without exp claim', () => {
    const noExpToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.signature';
    expect(() => service.getTokenExpirationTime(noExpToken)).toThrowError('Token does not contain valid exp claim');
  });

  it('should calculate time until expiry', () => {
    const timeLeft = service.getTimeUntilExpiry(validToken);
    expect(timeLeft).toBeGreaterThan(0);
  });

  it('should detect token expiring soon', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 30;
    const soonToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(JSON.stringify({ exp: futureExp })) + '.sig';
    const customToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      btoa(JSON.stringify({ exp: futureExp })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_') +
      '.signature';
    expect(service.isTokenExpiringSoon(customToken, 60)).toBeTrue();
  });

  it('should detect token not expiring soon', () => {
    expect(service.isTokenExpiringSoon(validToken, 60)).toBeFalse();
  });

  it('should throw for negative threshold', () => {
    expect(() => service.isTokenExpiringSoon(validToken, -1)).toThrowError('Threshold must be non-negative');
  });

  // ==================== TOKEN REFRESH ====================

  it('should refresh token', (done) => {
    localStorage.setItem('refresh_token', 'refresh-123');
    service.refreshToken().subscribe(response => {
      expect(response.access_token).toBe('new-access-token');
      expect(service.isRefreshing).toBeFalse();
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/realms'));
    req.flush({ access_token: 'new-access-token', refresh_token: 'new-refresh-token' });
  });

  it('should update stored tokens after refresh', (done) => {
    localStorage.setItem('refresh_token', 'refresh-123');
    localStorage.setItem('currentUser', JSON.stringify({ id: '1', token: 'old-token' }));

    service.refreshToken().subscribe(() => {
      expect(localStorage.getItem('access_token')).toBe('new-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      expect(user.token).toBe('new-access-token');
      done();
    });

    const req = httpMock.expectOne((r) => r.url.includes('/realms'));
    req.flush({ access_token: 'new-access-token', refresh_token: 'new-refresh-token' });
  });

  it('should fail refresh without refresh token', (done) => {
    service.refreshToken().subscribe({
      error: (err) => {
        expect(err.message).toContain('No refresh token available');
        expect(service.isRefreshing).toBeFalse();
        done();
      }
    });
  });

  it('should handle refresh HTTP error', (done) => {
    localStorage.setItem('refresh_token', 'refresh-123');
    service.refreshToken().subscribe({
      error: (err) => {
        expect(err.message).toContain('Token refresh failed');
        expect(service.isRefreshing).toBeFalse();
        done();
      }
    });

    const req = httpMock.expectOne((r) => r.url.includes('/realms'));
    req.flush({ error: 'invalid_grant', error_description: 'Invalid refresh token' }, { status: 400, statusText: 'Bad Request' });
  });

  // ==================== OBSERVABLE ====================

  it('should emit new token via refresh observable', (done) => {
    service.getRefreshObservable().subscribe(token => {
      expect(token).toBe('new-token');
      done();
    });

    service.refreshSubject.next('new-token');
  });

  it('should update stored tokens', () => {
    service.updateStoredTokens({ access_token: 'token-1', refresh_token: 'refresh-1', expires_in: 300, refresh_expires_in: 1800, token_type: 'Bearer' });
    expect(localStorage.getItem('access_token')).toBe('token-1');
    expect(localStorage.getItem('refresh_token')).toBe('refresh-1');
  });

  it('should throw when updating tokens without access_token', () => {
    expect(() => service.updateStoredTokens({ access_token: '', refresh_token: '', expires_in: 0, refresh_expires_in: 0, token_type: '' })).toThrowError('TokenResponse must contain access_token');
  });

  it('should handle invalid user JSON when updating tokens', () => {
    localStorage.setItem('currentUser', 'invalid-json');
    service.updateStoredTokens({ access_token: 'token-1', refresh_token: '', expires_in: 300, refresh_expires_in: 1800, token_type: 'Bearer' });
    expect(localStorage.getItem('access_token')).toBe('token-1');
  });
});
