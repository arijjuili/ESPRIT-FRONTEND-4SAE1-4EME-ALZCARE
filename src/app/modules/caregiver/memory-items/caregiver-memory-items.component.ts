import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  MemoryCategory,
  MemoryItem,
  MemoryItemCreateRequest,
  MemoryItemUpdateRequest,
  PatientProfile
} from '../../../core/models/api.model';

interface MemoryItemForm {
  patientId: string;
  memoryCategory: MemoryCategory;
  title: string;
  description: string;
  imageUrl: string;
  location: string;
  persons: string[];
  questions: string[];
  correctAnswers: string[];
}

@Component({
  selector: 'app-caregiver-memory-items',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './caregiver-memory-items.component.html',
  styleUrls: ['./caregiver-memory-items.component.scss']
})
export class CaregiverMemoryItemsComponent implements OnInit {
  memoryItems: MemoryItem[] = [];
  patients: PatientProfile[] = [];
  loading = false;
  error = '';
  success = '';

  patientNameFilter = '';
  categoryFilter: MemoryCategory | 'ALL' = 'ALL';
  categories = Object.values(MemoryCategory);
  patientNames: Record<string, string> = {};

  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  pendingDelete: MemoryItem | null = null;
  createSubmitted = false;
  editSubmitted = false;

  createForm: MemoryItemForm = {
    patientId: '',
    memoryCategory: MemoryCategory.FAMILY,
    title: '',
    description: '',
    imageUrl: '',
    location: '',
    persons: [''],
    questions: [''],
    correctAnswers: ['']
  };

  editForm: MemoryItemForm = {
    patientId: '',
    memoryCategory: MemoryCategory.FAMILY,
    title: '',
    description: '',
    imageUrl: '',
    location: '',
    persons: [''],
    questions: [''],
    correctAnswers: ['']
  };

  editingItem: MemoryItem | null = null;

  constructor(private apiService: ApiService, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadPatients();
    this.loadMemoryItems();
  }

  get filteredMemoryItems(): MemoryItem[] {
    let items = this.memoryItems;
    if (this.categoryFilter !== 'ALL') {
      items = items.filter(item => item.memoryCategory === this.categoryFilter);
    }
    const nameFilter = this.patientNameFilter.trim().toLowerCase();
    if (!nameFilter) return items;
    return items.filter(item => this.getPatientName(item.patientId).toLowerCase().includes(nameFilter));
  }

  loadMemoryItems(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.apiService.getMemoryItems().subscribe({
      next: (items) => {
        this.memoryItems = items;
        this.resolvePatientNames(items);
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load memory items:', err);
        this.error = err.error?.detail || 'Failed to load memory items';
        this.loading = false;
      }
    });
  }

  createMemoryItem(): void {
    this.createSubmitted = true;
    this.error = '';
    this.success = '';

    if (!this.createForm.patientId.trim() || !this.createForm.title.trim()) {
      this.error = 'Patient and title are required';
      return;
    }

    const questionPayload = this.buildQuestionAnswerPayload(this.createForm);
    if (!questionPayload) {
      return;
    }

    const payload: MemoryItemCreateRequest = {
      patientId: this.createForm.patientId.trim(),
      memoryCategory: this.createForm.memoryCategory,
      title: this.createForm.title.trim(),
      description: this.createForm.description.trim() || undefined,
      imageUrl: this.createForm.imageUrl.trim() || undefined,
      location: this.createForm.location.trim() || undefined,
      persons: this.cleanList(this.createForm.persons),
      questions: questionPayload.questions,
      correctAnswers: questionPayload.correctAnswers,
      createdAt: new Date().toISOString()
    };

    this.loading = true;
    this.apiService.createMemoryItem(payload).subscribe({
      next: () => {
        this.success = 'Memory item created successfully';
        this.resetCreateForm();
        this.showCreateModal = false;
        this.loadMemoryItems();
      },
      error: (err) => {
        console.error('Failed to create memory item:', err);
        this.error = err.error?.detail || 'Failed to create memory item';
        this.loading = false;
      }
    });
  }

  startEdit(item: MemoryItem): void {
    this.editingItem = item;
    this.showEditModal = true;
    this.editSubmitted = false;
    const questions = item.questions && item.questions.length > 0 ? [...item.questions] : [''];
    const correctAnswers = item.correctAnswers && item.correctAnswers.length > 0
      ? [...item.correctAnswers]
      : new Array(questions.length).fill('');
    if (correctAnswers.length < questions.length) {
      correctAnswers.push(...new Array(questions.length - correctAnswers.length).fill(''));
    }
    if (correctAnswers.length > questions.length) {
      correctAnswers.splice(questions.length);
    }
    this.editForm = {
      patientId: item.patientId,
      memoryCategory: item.memoryCategory,
      title: item.title,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      location: item.location || '',
      persons: item.persons && item.persons.length > 0 ? [...item.persons] : [''],
      questions,
      correctAnswers
    };
  }

  cancelEdit(): void {
    this.editingItem = null;
    this.showEditModal = false;
    this.success = '';
    this.error = '';
    this.editSubmitted = false;
  }

  updateMemoryItem(): void {
    if (!this.editingItem) return;
    this.editSubmitted = true;
    this.error = '';
    this.success = '';

    const questionPayload = this.buildQuestionAnswerPayload(this.editForm);
    if (!questionPayload) {
      return;
    }

    const payload: MemoryItemUpdateRequest = {
      memoryCategory: this.editForm.memoryCategory,
      title: this.editForm.title.trim(),
      description: this.editForm.description.trim() || undefined,
      imageUrl: this.editForm.imageUrl.trim() || undefined,
      location: this.editForm.location.trim() || undefined,
      persons: this.cleanList(this.editForm.persons),
      questions: questionPayload.questions,
      correctAnswers: questionPayload.correctAnswers
    };

    this.loading = true;
    this.apiService.updateMemoryItem(this.editingItem.id, payload).subscribe({
      next: () => {
        this.success = 'Memory item updated successfully';
        this.editingItem = null;
        this.showEditModal = false;
        this.loadMemoryItems();
      },
      error: (err) => {
        console.error('Failed to update memory item:', err);
        this.error = err.error?.detail || 'Failed to update memory item';
        this.loading = false;
      }
    });
  }

  requestDelete(item: MemoryItem): void {
    this.pendingDelete = item;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.pendingDelete) return;
    const item = this.pendingDelete;
    this.loading = true;
    this.error = '';
    this.success = '';
    this.apiService.deleteMemoryItem(item.id).subscribe({
      next: () => {
        this.success = 'Memory item deleted';
        this.showDeleteModal = false;
        this.pendingDelete = null;
        this.loadMemoryItems();
      },
      error: (err) => {
        console.error('Failed to delete memory item:', err);
        this.error = err.error?.detail || 'Failed to delete memory item';
        this.loading = false;
      }
    });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.pendingDelete = null;
  }

  resetCreateForm(): void {
    this.createForm = {
      patientId: '',
      memoryCategory: MemoryCategory.FAMILY,
      title: '',
      description: '',
      imageUrl: '',
      location: '',
      persons: [''],
      questions: [''],
      correctAnswers: ['']
    };
    this.createSubmitted = false;
  }

  trackById(_: number, item: MemoryItem): string {
    return item.id;
  }

  trackByIndex(index: number): number {
    return index;
  }

  getPatientName(patientId: string): string {
    return this.patientNames[patientId] || `Patient ${patientId.slice(0, 8)}…`;
  }

  openCreateModal(): void {
    this.error = '';
    this.success = '';
    this.createSubmitted = false;
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createSubmitted = false;
  }

  addPerson(target: 'create' | 'edit'): void {
    const list = target === 'create' ? this.createForm.persons : this.editForm.persons;
    list.push('');
  }

  removePerson(target: 'create' | 'edit', index: number): void {
    const list = target === 'create' ? this.createForm.persons : this.editForm.persons;
    list.splice(index, 1);
    if (list.length === 0) list.push('');
  }

  addQuestion(target: 'create' | 'edit'): void {
    const form = target === 'create' ? this.createForm : this.editForm;
    form.questions.push('');
    form.correctAnswers.push('');
  }

  removeQuestion(target: 'create' | 'edit', index: number): void {
    const form = target === 'create' ? this.createForm : this.editForm;
    form.questions.splice(index, 1);
    form.correctAnswers.splice(index, 1);
    if (form.questions.length === 0) {
      form.questions.push('');
      form.correctAnswers.push('');
    }
  }

  private cleanList(values: string[]): string[] | undefined {
    const items = values.map(value => value.trim()).filter(value => value.length > 0);
    return items.length > 0 ? items : undefined;
  }

  isQuestionPairInvalid(target: 'create' | 'edit', index: number): boolean {
    const form = target === 'create' ? this.createForm : this.editForm;
    const question = (form.questions[index] || '').trim();
    const answer = (form.correctAnswers[index] || '').trim();
    return (question.length > 0 && answer.length === 0) || (answer.length > 0 && question.length === 0);
  }

  private buildQuestionAnswerPayload(form: MemoryItemForm): { questions?: string[]; correctAnswers?: string[] } | null {
    const questions = form.questions.map(value => value.trim());
    const answers = form.correctAnswers.map(value => value.trim());
    const maxLength = Math.max(questions.length, answers.length);
    const mergedQuestions: string[] = [];
    const mergedAnswers: string[] = [];

    for (let i = 0; i < maxLength; i++) {
      const question = questions[i] || '';
      const answer = answers[i] || '';
      if (!question && !answer) {
        continue;
      }
      if (!question || !answer) {
        this.error = 'Each question must have a matching correct answer';
        return null;
      }
      mergedQuestions.push(question);
      mergedAnswers.push(answer);
    }

    if (mergedQuestions.length === 0) {
      return { questions: undefined, correctAnswers: undefined };
    }

    return { questions: mergedQuestions, correctAnswers: mergedAnswers };
  }

  private loadPatients(): void {
    const caregiverId = this.authService.getCurrentUser()?.id;
    if (!caregiverId) {
      this.patients = [];
      return;
    }

    this.apiService.getCaregiverPatients(caregiverId, true).subscribe({
      next: (patients) => {
        this.patients = patients;
        patients.forEach(patient => {
          const name = `${patient.firstName} ${patient.lastName}`.trim();
          this.patientNames[patient.userId] = name || patient.userId;
        });
      },
      error: () => {
        // fallback: keep dropdown empty; names will be resolved per memory item if possible
      }
    });
  }

  private resolvePatientNames(items: MemoryItem[]): void {
    const uniqueIds = Array.from(new Set(items.map(item => item.patientId)));
    uniqueIds.forEach(id => {
      if (this.patientNames[id]) return;
      this.apiService.getPatientByKeycloakId(id).subscribe({
        next: (profile) => {
          const name = `${profile.firstName} ${profile.lastName}`.trim();
          this.patientNames[id] = name || id;
        },
        error: () => {
          this.patientNames[id] = `Patient ${id.slice(0, 8)}…`;
        }
      });
    });
  }
}
