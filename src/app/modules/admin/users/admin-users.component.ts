import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserManagementService } from '../../../core/services/user-management.service';
import { ValidationUtils } from '../../../core/utils/validation.utils';
import {
  ManagedUser,
  UserRole,
  UserStatus,
  UserFilter,
  CreateUserRequest
} from '../../../core/models/user-management.model';
import {
  PatientProfile,
  DoctorProfile,
  CaregiverProfile,
  PatientUpdateRequest,
  DoctorUpdateRequest,
  CaregiverUpdateRequest,
  GenderEnum,
  LanguageEnum
} from '../../../core/models/api.model';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.scss']
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Users data
  users: ManagedUser[] = [];
  loading = false;
  error = '';

  // Filtering and Pagination
  filter: UserFilter = {};
  searchQuery = '';
  selectedRole: UserRole | '' = '';
  selectedStatus: UserStatus | '' = '';
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Modal states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showProfileModal = false;
  showEditProfileModal = false;
  selectedUser: ManagedUser | null = null;

  // Profile data
  selectedProfile: PatientProfile | DoctorProfile | CaregiverProfile | null = null;
  profileType: 'PATIENT' | 'DOCTOR' | 'CAREGIVER' | null = null;
  profileLoading = false;
  profileError = '';

  // Profile edit form
  profileEditForm: Partial<PatientUpdateRequest & DoctorUpdateRequest & CaregiverUpdateRequest> = {};

  // Enums for template
  GenderEnum = GenderEnum;
  LanguageEnum = LanguageEnum;
  
  // Math for template
  Math = Math;

  // New user form
  newUser: CreateUserRequest = {
    username: '',
    email: '',
    password: '',
    role: 'PATIENT',
    emailVerified: true  // Default to true so users can login immediately
  };

  // Stats
  userStats: {
    total: number;
    active: number;
    inactive: number;
    pending: number;
    byRole: Record<UserRole, number>;
  } = {
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    byRole: {
      PATIENT: 0,
      DOCTOR: 0,
      CAREGIVER: 0,
      ADMIN: 0
    }
  };

  // Role options
  roleOptions: { value: UserRole; label: string; color: string }[] = [
    { value: 'ADMIN', label: 'Admin', color: 'rose' },
    { value: 'DOCTOR', label: 'Doctor', color: 'violet' },
    { value: 'CAREGIVER', label: 'Caregiver', color: 'blue' },
    { value: 'PATIENT', label: 'Patient', color: 'emerald' }
  ];

  constructor(private userService: UserManagementService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Open profile view modal
   */
  openProfileModal(user: ManagedUser): void {
    if (user.role === 'ADMIN') {
      this.error = 'Admin users do not have profiles';
      return;
    }
    
    this.selectedUser = user;
    this.profileType = user.role as 'PATIENT' | 'DOCTOR' | 'CAREGIVER';
    this.profileLoading = true;
    this.showProfileModal = true;
    this.profileError = '';

    this.userService.getUserProfile(user.id).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (profile) => {
        this.selectedProfile = profile;
        this.profileLoading = false;
      },
      error: (err) => {
        console.error('Failed to load profile:', err);
        this.profileError = err.error?.detail || 'Failed to load profile';
        this.profileLoading = false;
      }
    });
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
    this.selectedProfile = null;
    this.profileType = null;
    this.profileError = '';
  }

  /**
   * Open profile edit modal
   */
  openEditProfileModal(): void {
    if (!this.selectedProfile || !this.profileType) return;

    // Initialize form based on profile type
    switch (this.profileType) {
      case 'PATIENT':
        const patientProfile = this.selectedProfile as PatientProfile;
        this.profileEditForm = {
          firstName: patientProfile.firstName,
          lastName: patientProfile.lastName,
          dateOfBirth: patientProfile.dateOfBirth,
          gender: patientProfile.gender,
          phone: patientProfile.phone,
          emergencyContact: patientProfile.emergencyContact,
          address: patientProfile.address,
          isActive: patientProfile.isActive
        };
        break;
      case 'DOCTOR':
        const doctorProfile = this.selectedProfile as DoctorProfile;
        this.profileEditForm = {
          firstName: doctorProfile.firstName,
          lastName: doctorProfile.lastName,
          speciality: doctorProfile.speciality,
          licenseNumber: doctorProfile.licenseNumber,
          phone: doctorProfile.phone,
          contact: doctorProfile.contact,
          address: doctorProfile.address,
          isAvailable: doctorProfile.isAvailable
        };
        break;
      case 'CAREGIVER':
        const caregiverProfile = this.selectedProfile as CaregiverProfile;
        this.profileEditForm = {
          firstName: caregiverProfile.firstName,
          lastName: caregiverProfile.lastName,
          phone: caregiverProfile.phone,
          contact: caregiverProfile.contact,
          address: caregiverProfile.address,
          isAvailable: caregiverProfile.isAvailable,
          isProfessional: caregiverProfile.isProfessional
        };
        break;
    }

    this.showEditProfileModal = true;
  }

  closeEditProfileModal(): void {
    this.showEditProfileModal = false;
    this.profileEditForm = {};
    this.profileError = '';
  }

  /**
   * Save profile changes
   */
  saveProfileChanges(): void {
    if (!this.selectedUser || !this.profileType) return;

    this.profileLoading = true;
    this.profileError = '';

    switch (this.profileType) {
      case 'PATIENT':
        this.userService.updatePatientProfile(
          this.selectedUser.id,
          this.profileEditForm as PatientUpdateRequest
        ).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (updated) => {
            this.selectedProfile = updated;
            this.closeEditProfileModal();
            this.profileLoading = false;
          },
          error: (err) => {
            console.error('Failed to update patient profile:', err);
            this.profileError = err.error?.detail || 'Failed to update profile';
            this.profileLoading = false;
          }
        });
        break;
      case 'DOCTOR':
        this.userService.updateDoctorProfile(
          this.selectedUser.id,
          this.profileEditForm as DoctorUpdateRequest
        ).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (updated) => {
            this.selectedProfile = updated;
            this.closeEditProfileModal();
            this.profileLoading = false;
          },
          error: (err) => {
            console.error('Failed to update doctor profile:', err);
            this.profileError = err.error?.detail || 'Failed to update profile';
            this.profileLoading = false;
          }
        });
        break;
      case 'CAREGIVER':
        this.userService.updateCaregiverProfile(
          this.selectedUser.id,
          this.profileEditForm as CaregiverUpdateRequest
        ).pipe(
          takeUntil(this.destroy$)
        ).subscribe({
          next: (updated) => {
            this.selectedProfile = updated;
            this.closeEditProfileModal();
            this.profileLoading = false;
          },
          error: (err) => {
            console.error('Failed to update caregiver profile:', err);
            this.profileError = err.error?.detail || 'Failed to update profile';
            this.profileLoading = false;
          }
        });
        break;
      default:
        this.profileLoading = false;
        return;
    }
  }

  /**
   * Type guard for patient profile
   */
  isPatientProfile(profile: any): profile is PatientProfile {
    return this.profileType === 'PATIENT' && 'dateOfBirth' in profile;
  }

  /**
   * Type guard for doctor profile
   */
  isDoctorProfile(profile: any): profile is DoctorProfile {
    return this.profileType === 'DOCTOR' && 'speciality' in profile;
  }

  /**
   * Type guard for caregiver profile
   */
  isCaregiverProfile(profile: any): profile is CaregiverProfile {
    return this.profileType === 'CAREGIVER' && 'isProfessional' in profile;
  }

  // ==================== DATA LOADING ====================

  loadUsers(): void {
    this.loading = true;
    this.error = '';

    const filter: UserFilter = {
      search: this.searchQuery || undefined,
      role: this.selectedRole || undefined,
      status: this.selectedStatus || undefined
    };

    this.userService.getUsers(filter, this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (response) => {
          this.users = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.calculateStats();
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load users:', err);
          this.error = err.error?.detail || 'Failed to load users. Please try again.';
          this.loading = false;
        }
      });
  }

  calculateStats(): void {
    this.userStats = {
      total: this.totalElements,
      active: this.users.filter(u => u.status === 'ACTIVE').length,
      inactive: this.users.filter(u => u.status === 'INACTIVE').length,
      pending: this.users.filter(u => u.status === 'PENDING').length,
      byRole: {
        PATIENT: this.users.filter(u => u.role === 'PATIENT').length,
        DOCTOR: this.users.filter(u => u.role === 'DOCTOR').length,
        CAREGIVER: this.users.filter(u => u.role === 'CAREGIVER').length,
        ADMIN: this.users.filter(u => u.role === 'ADMIN').length
      }
    };
  }

  // ==================== FILTERING ====================

  onSearch(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  onFilterChange(): void {
    this.selectedRole = this.selectedRole || undefined as any;
    this.selectedStatus = this.selectedStatus || undefined as any;
    this.currentPage = 0;
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedRole = '';
    this.selectedStatus = '';
    this.currentPage = 0;
    this.loadUsers();
  }

  // ==================== PAGINATION ====================

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  goToFirstPage(): void {
    this.goToPage(0);
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages - 1);
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadUsers();
  }

  /**
   * Get visible page numbers for pagination (with ellipsis)
   */
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      // Show all pages
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
      if (this.currentPage < 3) {
        // Near start
        for (let i = 0; i < 4; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages - 1);
      } else if (this.currentPage > this.totalPages - 4) {
        // Near end
        pages.push(0);
        pages.push(-1); // Ellipsis
        for (let i = this.totalPages - 4; i < this.totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Middle
        pages.push(0);
        pages.push(-1); // Ellipsis
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(this.totalPages - 1);
      }
    }
    
    return pages;
  }

  // ==================== CREATE USER ====================

  openCreateModal(): void {
    this.newUser = {
      username: '',
      email: '',
      password: '',
      role: 'PATIENT',
      emailVerified: true
    };
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createUser(): void {
    if (!this.validateNewUser()) {
      return;
    }

    this.loading = true;
    this.userService.createUser(this.newUser)
      .pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (user) => {
          this.users.unshift(user);
          this.closeCreateModal();
          this.loading = false;
          this.calculateStats();
        },
        error: (err) => {
          console.error('Failed to create user:', err);
          // Extract error message from ProblemDetail (RFC 7807) response
          const errorDetail = err.error?.detail;
          const errorMessage = err.error?.title;
          this.error = errorDetail || errorMessage || 'Failed to create user';
          this.loading = false;
        }
      });
  }

  private validateNewUser(): boolean {
    // Trim all text inputs before validation using ValidationUtils
    this.newUser = ValidationUtils.trimObject(this.newUser);

    // Check required fields
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.error = 'Please fill in all required fields';
      return false;
    }

    // Validate username format using ValidationUtils
    if (!ValidationUtils.isValidUsername(this.newUser.username)) {
      this.error = 'Username must be 3-20 characters and can only contain letters, numbers, and underscores';
      return false;
    }

    // Validate email format using ValidationUtils
    if (!ValidationUtils.isValidEmail(this.newUser.email)) {
      this.error = 'Please enter a valid email address';
      return false;
    }

    // Validate first name and last name
    if (!this.newUser.firstName || !this.newUser.lastName) {
      this.error = 'First name and last name are required';
      return false;
    }
    if (!ValidationUtils.hasMinLength(this.newUser.firstName, 2) || !ValidationUtils.hasMaxLength(this.newUser.firstName, 50)) {
      this.error = 'First name must be between 2 and 50 characters';
      return false;
    }
    if (!ValidationUtils.hasMinLength(this.newUser.lastName, 2) || !ValidationUtils.hasMaxLength(this.newUser.lastName, 50)) {
      this.error = 'Last name must be between 2 and 50 characters';
      return false;
    }

    // Validate password complexity using ValidationUtils
    const passwordValidation = ValidationUtils.isValidPassword(this.newUser.password);
    if (!passwordValidation.valid) {
      this.error = passwordValidation.message || 'Password does not meet requirements';
      return false;
    }

    return true;
  }

  // ==================== EDIT USER ====================

  openEditModal(user: ManagedUser): void {
    this.selectedUser = { ...user };
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
  }

  updateUser(): void {
    if (!this.selectedUser) return;

    this.loading = true;
    this.userService.updateUser(this.selectedUser.id, {
      email: this.selectedUser.email,
      firstName: this.selectedUser.firstName,
      lastName: this.selectedUser.lastName,
      enabled: this.selectedUser.enabled,
      role: this.selectedUser.role
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        this.closeEditModal();
        this.loading = false;
        this.calculateStats();
      },
      error: (err) => {
        console.error('Failed to update user:', err);
        this.error = err.error?.detail || 'Failed to update user';
        this.loading = false;
      }
    });
  }

  // ==================== DELETE USER ====================

  openDeleteModal(user: ManagedUser): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  deleteUser(): void {
    if (!this.selectedUser) return;

    this.loading = true;
    this.userService.deleteUser(this.selectedUser.id)
      .pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== this.selectedUser!.id);
          this.closeDeleteModal();
          this.loading = false;
          this.calculateStats();
        },
        error: (err) => {
          console.error('Failed to delete user:', err);
          this.error = err.error?.detail || 'Failed to delete user';
          this.loading = false;
        }
      });
  }

  // ==================== UTILITY ====================

  getRoleClass(role: string): string {
    const classes: Record<string, string> = {
      ADMIN: 'bg-rose-100 text-rose-700 border-rose-200',
      DOCTOR: 'bg-violet-100 text-violet-700 border-violet-200',
      CAREGIVER: 'bg-blue-100 text-blue-700 border-blue-200',
      PATIENT: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };
    return classes[role] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      ACTIVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
      PENDING: 'bg-amber-100 text-amber-700 border-amber-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  getAvatarClass(role: string): string {
    const classes: Record<string, string> = {
      ADMIN: 'bg-gradient-to-br from-rose-500 to-rose-600',
      DOCTOR: 'bg-gradient-to-br from-violet-500 to-violet-600',
      CAREGIVER: 'bg-gradient-to-br from-blue-500 to-blue-600',
      PATIENT: 'bg-gradient-to-br from-emerald-500 to-emerald-600'
    };
    return classes[role] || 'bg-gradient-to-br from-gray-500 to-gray-600';
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Format date for input[type="date"]
   */
  formatDateForInput(date: string | Date | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
}
