import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';
import { CommunityService } from '../../../core/services/community.service';
import { ActivityService } from '../../../core/services/activity.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { Post, DiscussionCategory } from '../../../core/models/community.model';
import { ActivityResponse, ActivityType, ActivityStatus, ActivityCreateRequest } from '../../../core/models/activity.model';

type AdminTab = 'posts' | 'activities';

@Component({
  selector: 'app-admin-community',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-community.component.html',
  styleUrls: ['./admin-community.component.scss']
})
export class AdminCommunityComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  activeTab: AdminTab = 'posts';

  // ── Posts ──────────────────────────────────────────────────────
  posts: Post[] = [];
  recentPosts: Post[] = [];
  loadingPosts = false;
  deletingPostId: string | null = null;
  selectedCategory: DiscussionCategory | '' = '';
  totalPostElements = 0;
  postsPage = 0;
  postsPageSize = 10;

  readonly postCategories: { value: DiscussionCategory; label: string; icon: string }[] = [
    { value: 'ADVICE', label: 'Advice & Tips', icon: '💡' },
    { value: 'SUPPORT', label: 'Support & Encouragement', icon: '🤝' },
    { value: 'RESOURCES', label: 'Resources & Information', icon: '📚' },
    { value: 'SUCCESS_STORIES', label: 'Success Stories', icon: '🎉' },
    { value: 'QUESTIONS', label: 'Questions & Answers', icon: '❓' }
  ];

  // ── Activities ─────────────────────────────────────────────────
  activities: ActivityResponse[] = [];
  loadingActivities = false;
  filterActivityStatus: ActivityStatus | '' = '';
  filterActivityType: ActivityType | '' = '';

  // Create / Edit modal
  showActivityModal = false;
  editingActivity: ActivityResponse | null = null;
  savingActivity = false;
  activityForm: FormGroup;

  cancellingActivityId: string | null = null;

  readonly activityTypes: { value: ActivityType; label: string }[] = [
    { value: 'GROUP', label: 'Group' },
    { value: 'INDIVIDUAL', label: 'Individual' },
    { value: 'VIRTUAL', label: 'Virtual' },
    { value: 'IN_PERSON', label: 'In-Person' }
  ];

  readonly activityStatuses: { value: ActivityStatus | ''; label: string }[] = [
    { value: '', label: 'All statuses' },
    { value: 'PUBLISHED', label: 'Published' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ];

  // ── Derived stats ─────────────────────────────────────────────
  get communityStats() {
    return [
      { label: 'Total Posts', value: this.totalPostElements, icon: '📝', color: 'violet' },
      { label: 'Total Activities', value: this.activities.length, icon: '📅', color: 'blue' },
      { label: 'Active Activities', value: this.activities.filter(a => a.status !== 'CANCELLED').length, icon: '✅', color: 'emerald' },
      { label: 'Post Categories', value: this.postCategories.length, icon: '🏷️', color: 'amber' }
    ];
  }

  constructor(
    private communityService: CommunityService,
    private activityService: ActivityService,
    private toastService: ToastService,
    private fb: FormBuilder
  ) {
    this.activityForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      type: ['GROUP', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      location: ['', Validators.required],
      maxCapacity: [20, [Validators.required, Validators.min(1)]],
      latitude: [null],
      longitude: [null]
    });
  }

  ngOnInit(): void {
    this.loadPosts();
    this.loadActivities();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: AdminTab): void {
    this.activeTab = tab;
  }

  // ═══════════════ POSTS ═══════════════

  loadPosts(): void {
    this.loadingPosts = true;
    this.communityService.getPosts(this.postsPage, this.postsPageSize, this.selectedCategory || undefined, 'NEWEST')
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to load posts');
          return of({ content: [], totalElements: 0, totalPages: 0, size: this.postsPageSize, number: 0 });
        }),
        finalize(() => { this.loadingPosts = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe((result: any) => {
        const list: Post[] = Array.isArray(result) ? result : (result?.content ?? []);
        this.posts = list;
        this.totalPostElements = Array.isArray(result) ? result.length : (result?.totalElements ?? list.length);
        this.recentPosts = list.slice(0, 4);
      });
  }

  applyPostFilter(): void {
    this.postsPage = 0;
    this.loadPosts();
  }

  deletePost(post: Post): void {
    if (!confirm(`Delete post "${post.title}"? This cannot be undone.`)) return;
    this.deletingPostId = post.id;
    this.communityService.deletePost(post.id)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to delete post');
          return of(undefined);
        }),
        finalize(() => { this.deletingPostId = null; }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.posts = this.posts.filter(p => p.id !== post.id);
        this.recentPosts = this.recentPosts.filter(p => p.id !== post.id);
        this.totalPostElements = Math.max(0, this.totalPostElements - 1);
        this.toastService.success('Post removed');
      });
  }

  prevPostsPage(): void {
    if (this.postsPage > 0) { this.postsPage--; this.loadPosts(); }
  }

  nextPostsPage(): void {
    if ((this.postsPage + 1) * this.postsPageSize < this.totalPostElements) { this.postsPage++; this.loadPosts(); }
  }

  get totalPostPages(): number {
    return Math.ceil(this.totalPostElements / this.postsPageSize);
  }

  // ═══════════════ ACTIVITIES ═══════════════

  loadActivities(): void {
    this.loadingActivities = true;
    this.activityService.getActivities({
      status: this.filterActivityStatus || undefined,
      type: this.filterActivityType || undefined
    })
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to load activities');
          return of([]);
        }),
        finalize(() => { this.loadingActivities = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe((result: any) => {
        this.activities = Array.isArray(result) ? result : (result?.content ?? []);
      });
  }

  applyActivityFilter(): void {
    this.loadActivities();
  }

  openCreateActivity(): void {
    this.editingActivity = null;
    this.activityForm.reset({
      type: 'GROUP',
      maxCapacity: 20
    });
    this.showActivityModal = true;
  }

  openEditActivity(activity: ActivityResponse): void {
    this.editingActivity = activity;
    // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
    const toLocal = (iso: string) => iso ? iso.slice(0, 16) : '';
    this.activityForm.patchValue({
      title: activity.title,
      description: activity.description,
      type: activity.type,
      startDate: toLocal(activity.startDate),
      endDate: toLocal(activity.endDate),
      location: activity.location,
      maxCapacity: activity.maxCapacity,
      latitude: activity.latitude ?? null,
      longitude: activity.longitude ?? null
    });
    this.showActivityModal = true;
  }

  closeActivityModal(): void {
    this.showActivityModal = false;
    this.editingActivity = null;
    this.activityForm.reset({ type: 'GROUP', maxCapacity: 20 });
  }

  submitActivityForm(): void {
    if (this.activityForm.invalid) {
      this.activityForm.markAllAsTouched();
      return;
    }
    const v = this.activityForm.value;
    const payload: ActivityCreateRequest = {
      title: v.title,
      description: v.description,
      type: v.type,
      startDate: v.startDate,
      endDate: v.endDate,
      location: v.location,
      maxCapacity: Number(v.maxCapacity),
      latitude: v.latitude ? Number(v.latitude) : undefined,
      longitude: v.longitude ? Number(v.longitude) : undefined
    };

    this.savingActivity = true;

    const request$ = this.editingActivity
      ? this.activityService.updateActivity(this.editingActivity.id, payload)
      : this.activityService.createActivity(payload);

    request$
      .pipe(
        catchError(err => {
          const msg = err.error?.message || err.error?.detail || 'Failed to save activity';
          this.toastService.error(msg);
          return of(null);
        }),
        finalize(() => { this.savingActivity = false; }),
        takeUntil(this.destroy$)
      )
      .subscribe(result => {
        if (result) {
          this.toastService.success(this.editingActivity ? 'Activity updated' : 'Activity created');
          this.closeActivityModal();
          this.loadActivities();
        }
      });
  }

  cancelActivity(activity: ActivityResponse): void {
    if (!confirm(`Cancel "${activity.title}"? Registered participants will be affected.`)) return;
    this.cancellingActivityId = activity.id;
    this.activityService.deleteActivity(activity.id)
      .pipe(
        catchError(() => {
          this.toastService.error('Failed to cancel activity');
          return of(undefined);
        }),
        finalize(() => { this.cancellingActivityId = null; }),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Mark as cancelled in local list
        const a = this.activities.find(x => x.id === activity.id);
        if (a) a.status = 'CANCELLED';
        this.toastService.success('Activity cancelled');
      });
  }

  // ── Helpers ────────────────────────────────────────────────────

  getCategoryLabel(cat: DiscussionCategory): string {
    return this.postCategories.find(c => c.value === cat)?.label ?? cat;
  }

  getCategoryIcon(cat: DiscussionCategory): string {
    return this.postCategories.find(c => c.value === cat)?.icon ?? '📌';
  }

  getCategoryClass(cat: DiscussionCategory): string {
    const m: Record<string, string> = {
      ADVICE: 'bg-blue-100 text-blue-700',
      SUPPORT: 'bg-emerald-100 text-emerald-700',
      RESOURCES: 'bg-violet-100 text-violet-700',
      SUCCESS_STORIES: 'bg-amber-100 text-amber-700',
      QUESTIONS: 'bg-rose-100 text-rose-700'
    };
    return m[cat] ?? 'bg-gray-100 text-gray-600';
  }

  activityStatusClass(status: ActivityStatus): string {
    const m: Record<string, string> = {
      PUBLISHED: 'bg-green-100 text-green-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      CANCELLED: 'bg-gray-100 text-gray-500'
    };
    return m[status] ?? 'bg-gray-100 text-gray-600';
  }

  activityTypeIcon(type: ActivityType): string {
    const m: Record<ActivityType, string> = { GROUP: '👥', INDIVIDUAL: '🧑', VIRTUAL: '💻', IN_PERSON: '📍' };
    return m[type] ?? '📋';
  }

  capacityPercent(a: ActivityResponse): number {
    if (!a.maxCapacity) return 0;
    return Math.min(100, Math.round((a.registeredCount / a.maxCapacity) * 100));
  }

  capacityBarClass(a: ActivityResponse): string {
    const pct = this.capacityPercent(a);
    if (pct >= 90) return 'bg-red-400';
    if (pct >= 60) return 'bg-yellow-400';
    return 'bg-green-400';
  }

  formatDate(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  formatPostDate(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffH = Math.round((now.getTime() - d.getTime()) / 3600000);
    if (diffH < 1) return 'Just now';
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  }

  getPopularityClass(score: number): string {
    if (score >= 100) return 'bg-red-100 text-red-700';
    if (score >= 50) return 'bg-amber-100 text-amber-700';
    if (score >= 20) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-500';
  }

  getPopularityLabel(score: number): string {
    if (score >= 100) return '🔥 Hot';
    if (score >= 50) return '⭐ Trending';
    if (score >= 20) return '📈 Rising';
    return '📊 New';
  }

  fieldError(field: string): boolean {
    const c = this.activityForm.get(field);
    return !!(c?.invalid && c.touched);
  }
}
