/**
 * Models Barrel Export
 * 
 * Centralized exports for all domain models.
 * Use: import { User, Notification } from '../core/models';
 */

// User & Patient Models
export * from './user.model';

// API & Auth Models
export * from './api.model';

// User Management Models (exclude UserRole to avoid conflict with user.model)
export {
    UserStatus,
    ManagedUser,
    CreateUserRequest,
    UpdateUserRequest,
    UserFilter,
    PaginatedResponse
} from './user-management.model';

// Safety Alert Models
export * from './safety-alert.model';

// Notification Models
export * from './notification.model';
export * from './notification-schedule.model';

// Care Team Models
export * from './care-team.model';
