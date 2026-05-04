import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { Notification, PagedNotificationResponse, UnreadCountResponse } from '../models/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService]
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(localStorage, 'getItem').and.returnValue('test-token');
  });

  afterEach(() => {
    httpMock.verify();
    service.stopPolling();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUnreadCount', () => {
    it('should return unread count and update subject', () => {
      const mockResponse: UnreadCountResponse = { unreadCount: 5 };

      service.getUnreadCount('user-1').subscribe(count => {
        expect(count).toBe(5);
      });

      const req = httpMock.expectOne('/api/v1/notifications/user/user-1/unread/count');
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', () => {
      const notificationId = 'notif-1';

      service.markAsRead(notificationId).subscribe(() => {
        expect(service.isMarkingAsRead(notificationId)).toBeFalse();
      });

      const req = httpMock.expectOne(`/api/v1/notifications/${notificationId}/read`);
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });

    it('should prevent duplicate mark-as-read requests', () => {
      const notificationId = 'notif-1';

      // First call should proceed
      service.markAsRead(notificationId).subscribe();
      expect(service.isMarkingAsRead(notificationId)).toBeTrue();

      // Second call should return immediately (no HTTP request)
      let secondEmitted = false;
      service.markAsRead(notificationId).subscribe(() => {
        secondEmitted = true;
      });
      expect(secondEmitted).toBeTrue();

      // Clean up pending request
      httpMock.expectOne(`/api/v1/notifications/${notificationId}/read`).flush(null);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for a user', () => {
      service.markAllAsRead('user-1').subscribe(() => {
        expect(service.getCurrentUnreadCount()).toBe(0);
      });

      const req = httpMock.expectOne('/api/v1/notifications/user/user-1/mark-all-read');
      expect(req.request.method).toBe('PUT');
      req.flush(null);
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', () => {
      const notificationId = 'notif-1';

      service.deleteNotification(notificationId).subscribe(() => {
        expect(service.isDeleting(notificationId)).toBeFalse();
      });

      const req = httpMock.expectOne(`/api/v1/notifications/${notificationId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getUserNotifications', () => {
    it('should fetch notifications with filters', () => {
      const mockResponse: PagedNotificationResponse = {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: 10,
        number: 0
      };

      service.getUserNotifications('user-1', { status: 'UNREAD', page: 0, size: 10 }).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(req =>
        req.url === '/api/v1/notifications/user/user-1' &&
        req.params.get('status') === 'UNREAD' &&
        req.params.get('page') === '0' &&
        req.params.get('size') === '10'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });
  });

  describe('polling', () => {
    it('should start and stop polling', fakeAsync(() => {
      service.startPolling('user-1', 1000);
      expect(service.isPolling()).toBeTrue();

      tick(1000);
      httpMock.expectOne('/api/v1/notifications/user/user-1/unread/count').flush({ unreadCount: 3 });

      service.stopPolling();
      expect(service.isPolling()).toBeFalse();
    }));

    it('should not start duplicate polling', fakeAsync(() => {
      service.startPolling('user-1', 1000);
      const firstSub = service['pollingSubscription'];

      service.startPolling('user-1', 1000);
      const secondSub = service['pollingSubscription'];

      expect(firstSub).not.toBe(secondSub);
      service.stopPolling();
    }));
  });

  describe('state helpers', () => {
    it('should update and increment unread count', () => {
      service.updateUnreadCount(5);
      expect(service.getCurrentUnreadCount()).toBe(5);

      service.incrementUnreadCount();
      expect(service.getCurrentUnreadCount()).toBe(6);
    });

    it('should return critical unread count', () => {
      const notifications: Notification[] = [
        { id: '1', status: 'UNREAD', priority: 'CRITICAL' } as Notification,
        { id: '2', status: 'UNREAD', priority: 'LOW' } as Notification,
        { id: '3', status: 'READ', priority: 'CRITICAL' } as Notification
      ];
      service['notificationsSubject'].next(notifications);

      expect(service.getCriticalUnreadCount()).toBe(1);
    });
  });
});
