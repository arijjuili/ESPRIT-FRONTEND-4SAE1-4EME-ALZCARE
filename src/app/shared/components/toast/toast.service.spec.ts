import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';
import { Subscription } from 'rxjs';

describe('ToastService', () => {
  let service: ToastService;
  let subs: Subscription[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
    (service as any).toastsSubject.next([]);
    subs = [];
  });

  afterEach(() => {
    subs.forEach(s => s.unsubscribe());
    // Clear any active timers to prevent cross-test pollution
    const timers = (service as any).activeTimers as Map<string, any>;
    if (timers) {
      timers.forEach((timer: any) => clearTimeout(timer));
      timers.clear();
    }
  });

  function sub(callback: (toasts: any[]) => void): void {
    subs.push(service.toasts$.subscribe(callback));
  }

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show a toast', () => {
    service.show('Test message', 'success', 'Title', 5000);
    sub(toasts => {
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].title).toBe('Title');
    });
  });

  it('should remove a toast', () => {
    service.show('Test', 'info');
    let toastId = '';
    sub(toasts => {
      if (toasts.length > 0) {
        toastId = toasts[0].id;
      }
    });
    service.remove(toastId);
    sub(toasts => {
      expect(toasts.length).toBe(0);
    });
  });

  it('should prevent duplicate toasts within 2 seconds', () => {
    service.show('Duplicate', 'info');
    service.show('Duplicate', 'info');
    sub(toasts => {
      expect(toasts.length).toBe(1);
    });
  });

  it('should allow different types with same message', () => {
    service.show('Same message', 'info');
    service.show('Same message', 'error');
    sub(toasts => {
      expect(toasts.length).toBe(2);
    });
  });

  it('should call success helper', () => {
    service.success('Success message');
    sub(toasts => {
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Success message');
    });
  });

  it('should call error helper', () => {
    service.error('Error message');
    sub(toasts => {
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].message).toBe('Error message');
    });
  });

  it('should call warning helper', () => {
    service.warning('Warning message');
    sub(toasts => {
      expect(toasts[0].type).toBe('warning');
      expect(toasts[0].message).toBe('Warning message');
    });
  });

  it('should call info helper', () => {
    service.info('Info message');
    sub(toasts => {
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].message).toBe('Info message');
    });
  });

  it('should call emergencyAlert helper', () => {
    service.emergencyAlert('Alert Title', 'Emergency message');
    sub(toasts => {
      expect(toasts[0].type).toBe('emergency');
      expect(toasts[0].title).toBe('Alert Title');
      expect(toasts[0].message).toBe('Emergency message');
      expect(toasts[0].duration).toBe(0);
    });
  });

  it('should limit toasts to 5', () => {
    for (let i = 0; i < 7; i++) {
      service.show(`Message ${i}`, 'info');
    }
    sub(toasts => {
      expect(toasts.length).toBe(5);
    });
  });

  it('should clear timer when removing toast', fakeAsync(() => {
    service.show('Timed toast', 'info', undefined, 100);
    let toastId = '';
    sub(toasts => {
      if (toasts.length > 0) {
        toastId = toasts[0].id;
      }
    });
    service.remove(toastId);
    tick(200);
    sub(toasts => {
      expect(toasts.length).toBe(0);
    });
  }));
});
