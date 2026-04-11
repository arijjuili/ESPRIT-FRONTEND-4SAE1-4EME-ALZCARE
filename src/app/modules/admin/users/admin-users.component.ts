import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UserManagementService } from '../../../core/services/user-management.service';
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

  private subscriptions: Subscription[] = [];

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
    this.subscriptions.forEach(s => s.unsubscribe());
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

    const sub = this.userService.getUserProfile(user.id).subscribe({
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
    this.subscriptions.push(sub);
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

    let sub: Subscription;

    switch (this.profileType) {
      case 'PATIENT':
        sub = this.userService.updatePatientProfile(
          this.selectedUser.id,
          this.profileEditForm as PatientUpdateRequest
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
        sub = this.userService.updateDoctorProfile(
          this.selectedUser.id,
          this.profileEditForm as DoctorUpdateRequest
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
        sub = this.userService.updateCaregiverProfile(
          this.selectedUser.id,
          this.profileEditForm as CaregiverUpdateRequest
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

    this.subscriptions.push(sub);
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

    const sub = this.userService.getUsers(filter, this.currentPage, this.pageSize)
      .subscribe({
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

    this.subscriptions.push(sub);
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
    const sub = this.userService.createUser(this.newUser)
      .subscribe({
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
    this.subscriptions.push(sub);
  }

  private validateNewUser(): boolean {
    if (!this.newUser.username || !this.newUser.email || !this.newUser.password) {
      this.error = 'Please fill in all required fields';
      return false;
    }
    if (!this.newUser.firstName || !this.newUser.lastName) {
      this.error = 'First name and last name are required';
      return false;
    }
    if (this.newUser.password.length < 8) {
      this.error = 'Password must be at least 8 characters';
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
    const sub = this.userService.updateUser(this.selectedUser.id, {
      email: this.selectedUser.email,
      firstName: this.selectedUser.firstName,
      lastName: this.selectedUser.lastName,
      enabled: this.selectedUser.enabled,
      role: this.selectedUser.role
    }).subscribe({
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
    this.subscriptions.push(sub);
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
    const sub = this.userService.deleteUser(this.selectedUser.id)
      .subscribe({
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
    this.subscriptions.push(sub);
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
    return new Date(date).toLocaleDateString('fr-FR', {
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
