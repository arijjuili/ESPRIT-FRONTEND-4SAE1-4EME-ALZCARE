import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Event } from '@angular/router';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: any;

  beforeEach(async () => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['login']);
    routerSpy = {
      navigate: jasmine.createSpy('navigate'),
      navigateByUrl: jasmine.createSpy('navigateByUrl'),
      createUrlTree: jasmine.createSpy('createUrlTree').and.returnValue({}),
      serializeUrl: jasmine.createSpy('serializeUrl').and.returnValue(''),
      events: of({} as Event),
      url: '/'
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy as any },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: jasmine.createSpy('get').and.returnValue(null)
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle password visibility', () => {
    expect(component.showPassword).toBeFalse();
    component.togglePassword();
    expect(component.showPassword).toBeTrue();
    component.togglePassword();
    expect(component.showPassword).toBeFalse();
  });

  it('should fill credentials', () => {
    component.fillCredentials('test@example.com', 'password123');
    expect(component.email).toBe('test@example.com');
    expect(component.password).toBe('password123');
    expect(component.error).toBe('');
  });

  it('should fill demo patient account', () => {
    component.fillDemoAccount('patient');
    expect(component.email).toBe('patient@example.com');
    expect(component.password).toBe('Password123!');
  });

  it('should fill demo admin account', () => {
    component.fillDemoAccount('admin');
    expect(component.email).toBe('admin@example.com');
    expect(component.password).toBe('Admin123!');
  });

  it('should fill demo caregiver account', () => {
    component.fillDemoAccount('caregiver');
    expect(component.email).toBe('caregiver@example.com');
    expect(component.password).toBe('Password123!');
  });

  it('should fill demo doctor account', () => {
    component.fillDemoAccount('doctor');
    expect(component.email).toBe('doctor@example.com');
    expect(component.password).toBe('Password123!');
  });

  it('should show error when email is empty', () => {
    component.email = '';
    component.password = 'password';
    component.onLogin();
    expect(component.error).toBe('Please fill in all fields');
  });

  it('should show error when password is empty', () => {
    component.email = 'test@example.com';
    component.password = '';
    component.onLogin();
    expect(component.error).toBe('Please fill in all fields');
  });

  it('should show error for invalid email', () => {
    component.email = 'invalid-email';
    component.password = 'password';
    component.onLogin();
    expect(component.error).toBe('Please enter a valid email address');
  });

  it('should login and navigate to patient dashboard', fakeAsync(() => {
    component.email = 'patient@example.com';
    component.password = 'Password123!';
    authServiceSpy.login.and.returnValue(of({
      id: '1',
      email: 'patient@example.com',
      name: 'John Patient',
      role: 'patient',
      token: 'mock-token'
    }));

    component.onLogin();
    tick(500);

    expect(authServiceSpy.login).toHaveBeenCalledWith('patient@example.com', 'Password123!');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/patient/dashboard']);
    expect(component.loading).toBeFalse();
  }));

  it('should login and navigate to caregiver dashboard', fakeAsync(() => {
    component.email = 'caregiver@example.com';
    component.password = 'Password123!';
    authServiceSpy.login.and.returnValue(of({
      id: '2',
      email: 'caregiver@example.com',
      name: 'Sarah Caregiver',
      role: 'caregiver',
      token: 'mock-token'
    }));

    component.onLogin();
    tick(500);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/caregiver/dashboard']);
  }));

  it('should login and navigate to doctor dashboard', fakeAsync(() => {
    component.email = 'doctor@example.com';
    component.password = 'Password123!';
    authServiceSpy.login.and.returnValue(of({
      id: '3',
      email: 'doctor@example.com',
      name: 'Dr. Michael',
      role: 'doctor',
      token: 'mock-token'
    }));

    component.onLogin();
    tick(500);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/doctor/dashboard']);
  }));

  it('should login and navigate to admin dashboard', fakeAsync(() => {
    component.email = 'admin@example.com';
    component.password = 'Admin123!';
    authServiceSpy.login.and.returnValue(of({
      id: '4',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      token: 'mock-token'
    }));

    component.onLogin();
    tick(500);

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  }));

  it('should navigate to returnUrl when provided', fakeAsync(() => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot.queryParamMap.get as jasmine.Spy).and.returnValue('/patient/profile');

    component.email = 'patient@example.com';
    component.password = 'Password123!';
    authServiceSpy.login.and.returnValue(of({
      id: '1',
      email: 'patient@example.com',
      name: 'John',
      role: 'patient',
      token: 'mock-token'
    }));

    component.onLogin();
    tick(500);

    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/patient/profile');
  }));

  it('should show error on login failure', fakeAsync(() => {
    component.email = 'wrong@example.com';
    component.password = 'wrongpass';
    authServiceSpy.login.and.returnValue(throwError(() => new Error('Invalid credentials')));

    component.onLogin();
    tick(500);

    expect(component.error).toBe('Invalid email or password. Please try again.');
    expect(component.loading).toBeFalse();
  }));
});
