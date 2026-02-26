// User Role Type
export type UserRole = 'ADMIN' | 'DOCTOR' | 'CAREGIVER' | 'PATIENT';

// User Status
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';

// Unified User Response from Backend
export interface ManagedUser {
  id: string;                    // Keycloak ID
  username: string;
  email: string;
  firstName?: string;            // Not available from Keycloak, may come from profile
  lastName?: string;             // Not available from Keycloak, may come from profile
  fullName?: string;             // Derived from profile or username
  role: UserRole;
  status: UserStatus;
  enabled: boolean;
  emailVerified: boolean;
  createdAt?: string;            // ISO date string
  lastLogin?: string;            // ISO date string
  // Profile data (optional, from Identity Service)
  profileId?: string;
  profile?: any;
}

// Create User Request
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  emailVerified?: boolean;
  enabled?: boolean;
  
  // Profile fields (role-specific)
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  preferredLanguage?: 'ARABIC' | 'FRENCH' | 'ENGLISH';
  culturalContext?: string;
  speciality?: string;
  licenseNumber?: string;
  relationship?: string;
  experience?: string;
}

// Update User Request
export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  role?: UserRole;
  
  // Profile update fields
  dateOfBirth?: string;
  gender?: 'MALE' | 'FEMALE';
  preferredLanguage?: 'ARABIC' | 'FRENCH' | 'ENGLISH';
  culturalContext?: string;
  speciality?: string;
  licenseNumber?: string;
  relationship?: string;
  experience?: string;
}

// User Filter/Search
export interface UserFilter {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

// Pagination Response
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
