import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
    (service as any).toastsSubject.next([]);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should show a toast', () => {
    service.show('Test message', 'success', 'Title', 5000);
    service.toasts$.subscribe(toasts => {
      expect(toasts.length).toBe(1);
      expect(toasts[0].message).toBe('Test message');
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].title).toBe('Title');
    });
  });

  it('should remove a toast', () => {
    service.show('Test', 'info');
    let toastId = '';
    service.toasts$.subscribe(toasts => {
      if (toasts.length > 0) {
        toastId = toasts[0].id;
      }
    });
    service.remove(toastId);
    service.toasts$.subscribe(toasts => {
      expect(toasts.length).toBe(0);
    });
  });

  it('should prevent duplicate toasts within 2 seconds', () => {
    service.show('Duplicate', 'info');
    service.show('Duplicate', 'info');
    service.toasts$.subscribe(toasts => {
      expect(toasts.length).toBe(1);
    });
  });

  it('should allow different types with same message', () => {
    service.show('Same message', 'info');
    service.show('Same message', 'error');
    service.toasts$.subscribe(toasts => {
      expect(toasts.length).toBe(2);
    });
  });

  it('should call success helper', () => {
    service.success('Success message');
    service.toasts$.subscribe(toasts => {
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].message).toBe('Success message');
    });
  });

  it('should call error helper', () => {
    service.error('Error message');
    service.toasts$.subscribe(toasts => {
      expect(toasts[0].type).toBe('error');
      expect(toasts[0].message).toBe('Error message');
    });
  });

  it('should call warning helper', () => {
    service.warning('Warning message');
    service.toasts$.subscribe(toasts => {
      expect(toasts[0].type).toBe('warning');
      expect(toasts[0].message).toBe('Warning message');
    });
  });

  it('should call info helper', () => {
    service.info('Info message');
    service.toasts$.subscribe(toasts => {
      expect(toasts[0].type).toBe('info');
      expect(toasts[0].message).toBe('Info message');
    });
  });

  it('should call emergencyAlert helper', () => {
    service.emergencyAlert('Alert Title', 'Emergency message');
    service.toasts$.subscribe(toasts => {
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
    service.toasts$.subscribe(toasts => {
      expect(toasts.length).toBe(5);
    });
  });

  it('should clear timer when removing toast', fakeAsync(() => {
    service.show('Timed toast', 'info', undefined, 100);
    let toastId = '';
    service.toasts$.subscribe(toasts => {
      if (toasts.length > 0) {
        toastId = toasts[0].id;
      }
    });
    service.remove(toastId);
    tick(200);
    service.toasts$.subscribe(toasts => {
      expect(toasts.length).toBe(0);
    });
  }));
});
