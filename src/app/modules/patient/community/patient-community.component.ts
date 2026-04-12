import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommunityService } from '../../../core/services/community.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToxicityWarningComponent } from '../../../shared/components/toxicity-warning/toxicity-warning.component';
import {
  Post,
  DiscussionCategory,
  CreatePostRequest,
  PaginatedPosts,
  PostSortOption
} from '../../../core/models/community.model';

@Component({
  selector: 'app-patient-community',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ToxicityWarningComponent],
  templateUrl: './patient-community.component.html',
  styleUrls: ['./patient-community.component.scss'],
  providers: [ToastService]
})
export class PatientCommunityComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  
  // Form for creating new posts
  postForm: FormGroup;
  showCreateForm = false;
  
  // Sorting and filtering
  currentSort: PostSortOption = 'NEWEST';
  selectedCategory: DiscussionCategory | null = null;
  
  // Toxicity warning
  showToxicityWarning = false;
  detectedToxicWords: string[] = [];
  
  // Categories for the dropdown
  categories: { value: DiscussionCategory; label: string; icon: string }[] = [
    { value: 'ADVICE', label: 'Advice & Tips', icon: '💡' },
    { value: 'SUPPORT', label: 'Support & Encouragement', icon: '🤝' },
    { value: 'RESOURCES', label: 'Resources & Information', icon: '📚' },
    { value: 'SUCCESS_STORIES', label: 'Success Stories', icon: '🎉' },
    { value: 'QUESTIONS', label: 'Questions & Answers', icon: '❓' }
  ];

  // Sort options
  sortOptions: { value: PostSortOption; label: string; icon: string }[] = [
    { value: 'NEWEST', label: 'Newest First', icon: '🕐' },
    { value: 'TRENDING', label: 'Trending', icon: '🔥' },
    { value: 'MOST_LIKED', label: 'Most Liked', icon: '❤️' },
    { value: 'MOST_COMMENTED', label: 'Most Discussed', icon: '💬' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private communityService: CommunityService,
    private toastService: ToastService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    // Initialize the form
    this.postForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      content: ['', [Validators.required, Validators.minLength(10)]],
      category: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadPosts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load posts from the backend
   */
  loadPosts(): void {
    this.isLoading = true;
    this.error = null;
    
    // Load first page of posts (10 per page)
    this.communityService.getPosts(0, 10, this.selectedCategory || undefined, this.currentSort)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paginatedPosts: PaginatedPosts) => {
          this.posts = paginatedPosts.content;
          this.isLoading = false;
        },
        error: (err: any) => {
          this.error = 'Failed to load community posts. Please try again.';
          this.isLoading = false;
          this.toastService.error(this.error, 'Load Error');
        }
      });
  }

  /**
   * Change the sort option
   */
  setSortOption(sort: PostSortOption): void {
    if (this.currentSort !== sort) {
      this.currentSort = sort;
      this.loadPosts();
    }
  }

  /**
   * Filter by category
   */
  setCategoryFilter(category: DiscussionCategory | null): void {
    if (this.selectedCategory !== category) {
      this.selectedCategory = category;
      this.loadPosts();
    }
  }

  /**
   * Toggle the create post form visibility
   */
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showToxicityWarning = false;
    if (this.showCreateForm) {
      this.postForm.reset();
    }
  }

  /**
   * Check content for toxicity before submitting
   */
  checkContentBeforeSubmit(): void {
    if (this.postForm.invalid) {
      this.toastService.warning('Please fill in all required fields.', 'Form Incomplete');
      return;
    }

    const title = this.postForm.get('title')?.value || '';
    const content = this.postForm.get('content')?.value || '';
    const fullContent = `${title} ${content}`;

    this.isSubmitting = true;

    // Check content for toxicity
    this.communityService.checkContent(fullContent)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result.toxic) {
            // Content is clean, proceed with submission
            this.submitPost();
          } else {
            // Toxic content detected
            this.isSubmitting = false;
            this.showToxicityWarning = true;
            this.detectedToxicWords = result.detectedWords;
            this.toastService.warning('Please review your content before posting.', 'Content Warning');
          }
        },
        error: (err) => {
          // If moderation check fails, still try to submit
          // Backend will do final validation
          this.submitPost();
        }
      });
  }

  /**
   * Create a new post
   */
  private submitPost(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.toastService.error('You must be logged in to create a post.', 'Authentication Required');
      this.isSubmitting = false;
      return;
    }

    const request: CreatePostRequest = {
      title: this.postForm.get('title')?.value,
      content: this.postForm.get('content')?.value,
      category: this.postForm.get('category')?.value,
      createdBy: currentUser.id
    };

    this.communityService.createPost(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newPost: Post) => {
          // Add the new post to the beginning of the list
          this.posts.unshift(newPost);
          
          // Reset form and hide it
          this.postForm.reset();
          this.showCreateForm = false;
          this.showToxicityWarning = false;
          this.isSubmitting = false;
          
          this.toastService.success('Your post has been created successfully!', 'Post Created');
        },
        error: (err: any) => {
          this.isSubmitting = false;
          
          // Check if it's a toxicity error
          if (err.status === 400 && err.error?.detectedWords) {
            this.showToxicityWarning = true;
            this.detectedToxicWords = err.error.detectedWords;
            this.toastService.error('Your post contains inappropriate language.', 'Content Rejected');
          } else {
            const errorMessage = err.error?.detail || err.error?.message || 'Failed to create post. Please try again.';
            this.toastService.error(errorMessage, 'Creation Error');
          }
        }
      });
  }

  /**
   * Create a new post (public method for form submission)
   */
  createPost(): void {
    this.checkContentBeforeSubmit();
  }

  /**
   * Dismiss toxicity warning
   */
  dismissToxicityWarning(): void {
    this.showToxicityWarning = false;
  }

  /**
   * Edit content after toxicity warning
   */
  editContent(): void {
    this.showToxicityWarning = false;
    // Focus on content field (could be enhanced with ViewChild)
    const contentField = document.getElementById('content');
    if (contentField) {
      contentField.focus();
    }
  }

  /**
   * Like a post
   */
  likePost(postId: string): void {
    this.communityService.likePost(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update the like count locally
          const post = this.posts.find(p => p.id === postId);
          if (post) {
            post.likeCount++;
            // Recalculate popularity locally (approximation)
            post.popularityScore += 2;
          }
          this.toastService.info('Post liked!', 'Thanks!');
        },
        error: () => {
          this.toastService.error('Failed to like post. Please try again.', 'Error');
        }
      });
  }

  /**
   * Navigate to post detail page
   */
  viewPost(postId: string): void {
    this.router.navigate(['/patient/community/post', postId]);
  }

  /**
   * Get category label for display
   */
  getCategoryLabel(category: DiscussionCategory): string {
    const found = this.categories.find(c => c.value === category);
    return found ? found.label : category;
  }

  /**
   * Get category icon for display
   */
  getCategoryIcon(category: DiscussionCategory): string {
    const found = this.categories.find(c => c.value === category);
    return found ? found.icon : '📌';
  }

  /**
   * Format the creation date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Retry loading posts after an error
   */
  retryLoadPosts(): void {
    this.loadPosts();
  }

  /**
   * Check if the current user is the author of the post
   */
  isPostAuthor(post: Post): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? post.createdBy === currentUser.id : false;
  }

  /**
   * Cancel creating a post
   */
  cancelCreatePost(): void {
    this.showCreateForm = false;
    this.showToxicityWarning = false;
    this.postForm.reset();
  }

  /**
   * Get the submit button text
   */
  getSubmitButtonText(): string {
    return this.isSubmitting ? 'Creating...' : 'Create Post';
  }

  /**
   * Get author name for a post - simplified to return userId since there's no UserManagementService
   */
  getAuthorName(post: Post): string {
    return post.createdBy;
  }

  /**
   * Check if the form has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.showCreateForm && this.postForm.dirty && !this.postForm.pristine;
  }

  /**
   * Get the current sort label
   */
  getCurrentSortLabel(): string {
    const found = this.sortOptions.find(s => s.value === this.currentSort);
    return found ? found.label : 'Sort';
  }

  /**
   * Get popularity badge color based on score
   */
  getPopularityBadgeClass(score: number): string {
    if (score >= 100) return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
    if (score >= 50) return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    if (score >= 20) return 'bg-gradient-to-r from-green-400 to-teal-500 text-white';
    return 'bg-gray-100 text-gray-600';
  }

  /**
   * Get popularity text
   */
  getPopularityText(score: number): string {
    if (score >= 100) return '🔥 Hot';
    if (score >= 50) return '⭐ Trending';
    if (score >= 20) return '📈 Rising';
    return '📊 New';
  }
}
