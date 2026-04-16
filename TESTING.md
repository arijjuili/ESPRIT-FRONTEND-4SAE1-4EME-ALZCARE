# Frontend Testing Guide

> **Framework**: Karma + Jasmine  
> **Project**: Alzheimer Care App (Angular 18)

---

## Table of Contents

1. [What Are Karma and Jasmine?](#what-are-karma-and-jasmine)
2. [Why We Use Them](#why-we-use-them)
3. [Running the Tests](#running-the-tests)
4. [Project Test Structure](#project-test-structure)
5. [Writing Tests](#writing-tests)
   - [Service Tests](#service-tests)
   - [Component Tests](#component-tests)
   - [HTTP Mocking](#http-mocking)
6. [Current Test Coverage](#current-test-coverage)
7. [Troubleshooting](#troubleshooting)

---

## What Are Karma and Jasmine?

### Jasmine
**Jasmine** is a behavior-driven development (BDD) framework for writing JavaScript/TypeScript tests. It gives you the vocabulary to describe what your code should do:

- `describe()` — groups related tests into a **suite**
- `it()` — defines a single **test case** (spec)
- `expect()` — makes an **assertion**
- `beforeEach()` — runs setup code before each test

Example:
```typescript
describe('AuthService', () => {
  it('should authenticate a valid user', () => {
    expect(service.isAuthenticated()).toBeTrue();
  });
});
```

### Karma
**Karma** is a **test runner**. It:
- Spins up a real browser (Chrome in our case)
- Loads your Angular application + test files
- Executes all Jasmine specs
- Reports pass/fail results back to the terminal
- Watches files and re-runs tests in development mode

Because we run in CI and headless environments, we use **Puppeteer** to provide a bundled Chromium browser—no manual Chrome installation needed.

---

## Why We Use Them

1. **Angular CLI Native Support**  
   `ng test` works out of the box with Karma + Jasmine.

2. **Real Browser Testing**  
   Great for DOM testing, component rendering, and integration tests.

3. **Readable Syntax**  
   `describe` / `it` / `expect` is easy to read and matches what teachers expect.

4. **Fast Feedback Loop**  
   Watch mode re-runs affected tests automatically as you code.

---

## Running the Tests

### One-shot run (CI mode)
```bash
npx ng test --no-watch
```

### Watch mode (development)
```bash
npx ng test
```
Re-runs tests automatically when files change and opens a browser report.

---

## Project Test Structure

All test files live next to the code they test and end with `.spec.ts`:

```
src/app/
├── core/services/
│   ├── auth.service.spec.ts
│   ├── api.service.spec.ts
│   ├── safety-alert.service.spec.ts
│   ├── activity-event.service.spec.ts
│   └── appointment-scheduling.service.spec.ts
└── shared/components/
    └── stat-card.component.spec.ts
```

---

## Writing Tests

### Service Tests

Service tests focus on:
- **Business logic** (calculations, state management)
- **HTTP communication** (mocked with `HttpTestingController`)

#### Example: Testing an HTTP call
```typescript
it('should get patient by Keycloak ID', () => {
  service.getPatientByKeycloakId('kc-123').subscribe(patient => {
    expect(patient.id).toBe('patient-1');
  });

  const req = httpMock.expectOne('/api/v1/patients/kc-123');
  expect(req.request.method).toBe('GET');

  req.flush(mockPatient); // return mock response
});
```

#### Example: Testing pure logic (no HTTP)
```typescript
it('should detect token expiration', () => {
  localStorage.setItem('access_token', expiredToken);
  expect(service.isTokenExpired()).toBeTrue();
});
```

### Component Tests

Component tests verify:
- **Template rendering** (DOM output)
- **Input bindings** (`@Input()`)
- **CSS classes and conditional elements**

#### Example: Testing a component template
```typescript
it('should display label and value', () => {
  component.label = 'Patients';
  component.value = 42;
  fixture.detectChanges();

  const compiled = fixture.nativeElement as HTMLElement;
  expect(compiled.textContent).toContain('Patients');
  expect(compiled.textContent).toContain('42');
});
```

### HTTP Mocking

We use `HttpClientTestingModule` and `HttpTestingController` to intercept and mock HTTP requests. This makes tests:
- **Fast** — no real network calls
- **Reliable** — no backend dependency
- **Deterministic** — same result every run

```typescript
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [HttpClientTestingModule],
    providers: [MyService]
  });
});

afterEach(() => {
  httpMock.verify(); // ensure no unexpected requests leaked
});
```

---

## Current Test Coverage

### Services

| Service | What We Test |
|---------|-------------|
| `AuthService` | Mock login/logout, Keycloak fallback, JWT decoding, token expiration, localStorage persistence |
| `ApiService` | Patient CRUD, doctor lookup, Keycloak login POST, query params |
| `SafetyAlertService` | Behavior logs (create, update, validate, delete), alerts (active, overdue, acknowledge, resolve, escalate, history), severity enum conversion |
| `ActivityEventService` | Fetching camera motion events by patient, error propagation |
| `AppointmentSchedulingService` | Date parsing, overlap detection, conflict analysis (blocking vs preemptible), automatic slot suggestion, weekend skipping |

### Components

| Component | What We Test |
|-----------|-------------|
| `StatCardComponent` | Input rendering, conditional subtitle, dynamic border color classes |

---

## Troubleshooting

### `No binary for Chrome browser on your platform`
Karma is configured to use Puppeteer’s bundled Chromium. If you see this error, ensure Puppeteer is installed:
```bash
npm install --save-dev puppeteer --legacy-peer-deps
```

### Tests timeout or hang
Usually caused by an unhandled HTTP request. Make sure you call `httpMock.verify()` in `afterEach` and that every expected request is flushed.

### `Expected no open requests, found 1`
You made an HTTP call in a test but did not flush it with `req.flush(...)`. Find the missing mock and add it.

### `Cannot find module '@types/jasmine'`
Install the types package:
```bash
npm install --save-dev @types/jasmine --legacy-peer-deps
```

---

## Quick Reference: Jasmine Matchers

| Matcher | Meaning |
|---------|---------|
| `toBe(value)` | Strict equality (`===`) |
| `toEqual(obj)` | Deep equality |
| `toBeTrue()` / `toBeFalse()` | Boolean checks |
| `toBeNull()` / `toBeUndefined()` | Null/undefined checks |
| `toContain(str)` | String or array containment |
| `toThrowError()` | Expects an error to be thrown |
| `toHaveBeenCalledWith(...)` | Spy call verification |

---

*Happy Testing!* 🧪
