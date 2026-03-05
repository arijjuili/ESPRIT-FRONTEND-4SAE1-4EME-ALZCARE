import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { CommunityService } from '../../../core/services/community.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Post,
  DiscussionCategory,
  CreatePostRequest,
  PaginatedPosts,
  ModerationResult,
  ToxicContentError
} from '../../../core/models/community.model';

@Component({
  selector: 'app-patient-community',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-community.component.html',
  styleUrls: ['./patient-community.component.scss'],
  providers: [ToastService]
})
export class PatientCommunityComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  
  // Feed type: 'latest' or 'trending'
  activeFeed: 'latest' | 'trending' = 'latest';
  
  // Form for creating new posts
  postForm: FormGroup;
  showCreateForm = false;
  
  // Content moderation
  contentCheckResult: ModerationResult | null = null;
  isCheckingContent = false;
  
  // Categories for the dropdown
  categories: { value: DiscussionCategory; label: string; icon: string }[] = [
    { value: 'ADVICE', label: 'Advice & Tips', icon: '💡' },
    { value: 'SUPPORT', label: 'Support & Encouragement', icon: '🤝' },
    { value: 'RESOURCES', label: 'Resources & Information', icon: '📚' },
    { value: 'SUCCESS_STORIES', label: 'Success Stories', icon: '🎉' },
    { value: 'QUESTIONS', label: 'Questions & Answers', icon: '❓' }
  ];

  private destroy$ = new Subject<void>();
  private contentCheck$ = new Subject<string>();

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

    // Setup debounced content checking
    this.contentCheck$.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(content => {
      if (content && content.length >= 3) {
        this.checkContent(content);
      }
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
   * Load posts from the backend based on active feed type
   */
  loadPosts(): void {
    this.isLoading = true;
    this.error = null;
    
    const loadObservable = this.activeFeed === 'trending'
      ? this.communityService.getTrendingPosts(0, 10)
      : this.communityService.getPosts(0, 10);
    
    loadObservable.subscribe({
      next: (paginatedPosts: PaginatedPosts) => {
        this.posts = paginatedPosts.content;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading posts:', err);
        this.error = 'Failed to load community posts. Please try again.';
        this.isLoading = false;
        this.toastService.error(this.error, 'Load Error');
      }
    });
  }

  /**
   * Switch between latest and trending feeds
   */
  switchFeed(feed: 'latest' | 'trending'): void {
    if (this.activeFeed !== feed) {
      this.activeFeed = feed;
      this.loadPosts();
    }
  }

  /**
   * Toggle the create post form visibility
   */
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.postForm.reset();
      this.contentCheckResult = null;
    }
  }

  /**
   * Check content for toxicity on form value changes
   */
  onContentChange(): void {
    const title = this.postForm.get('title')?.value || '';
    const content = this.postForm.get('content')?.value || '';
    const combinedContent = `${title} ${content}`.trim();
    
    if (combinedContent.length >= 3) {
      this.contentCheck$.next(combinedContent);
    }
  }

  /**
   * Check content for toxic/inappropriate language
   */
  private checkContent(content: string): void {
    this.isCheckingContent = true;
    
    this.communityService.checkContent(content).subscribe({
      next: (result: ModerationResult) => {
        this.contentCheckResult = result;
        this.isCheckingContent = false;
      },
      error: () => {
        // Fail open - assume content is clean if check fails
        this.contentCheckResult = { clean: true };
        this.isCheckingContent = false;
      }
    });
  }

  /**
   * Check if the current content has toxic words
   */
  hasToxicContent(): boolean {
    return this.contentCheckResult?.clean === false;
  }

  /**
   * Get detected toxic words for display
   */
  getDetectedWords(): string[] {
    return this.contentCheckResult?.detectedWords || [];
  }

  /**
   * Create a new post with content validation
   */
  createPost(): void {
    if (this.postForm.invalid) {
      this.toastService.warning('Please fill in all required fields.', 'Form Incomplete');
      return;
    }

    // Check for toxic content before submitting
    if (this.hasToxicContent()) {
      const words = this.getDetectedWords().join(', ');
      this.toastService.error(
        `Your post contains inappropriate language: ${words}. Please revise your content.`,
        'Inappropriate Content'
      );
      return;
    }

    this.isSubmitting = true;
    
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

    this.communityService.createPost(request).subscribe({
      next: (newPost: Post) => {
        // Add the new post to the beginning of the list
        this.posts.unshift(newPost);
        
        // Reset form and hide it
        this.postForm.reset();
        this.showCreateForm = false;
        this.isSubmitting = false;
        this.contentCheckResult = null;
        
        this.toastService.success('Your post has been created successfully!', 'Post Created');
      },
      error: (err: any) => {
        console.error('Error creating post:', err);
        this.isSubmitting = false;
        
        // Handle toxic content error from backend
        if (err.status === 400 && err.error?.type?.includes('inappropriate-content')) {
          const toxicError = err.error as ToxicContentError;
          const words = toxicError.detectedWords?.join(', ') || 'inappropriate words';
          this.toastService.error(
            `Inappropriate content detected: ${words}. Please revise your post.`,
            'Content Blocked'
          );
        } else {
          const errorMessage = err.error?.detail || err.error?.message || 'Failed to create post. Please try again.';
          this.toastService.error(errorMessage, 'Creation Error');
        }
      }
    });
  }

  /**
   * Like a post
   */
  likePost(postId: string): void {
    this.communityService.likePost(postId).subscribe({
      next: () => {
        // Update the like count locally
        const post = this.posts.find(p => p.id === postId);
        if (post) {
          post.likeCount++;
        }
        this.toastService.info('Post liked!', 'Thanks!');
      },
      error: (err: any) => {
        console.error('Error liking post:', err);
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
    this.postForm.reset();
    this.contentCheckResult = null;
  }

  /**
   * Get the submit button text
   */
  getSubmitButtonText(): string {
    return this.isSubmitting ? 'Creating...' : 'Create Post';
  }

  /**
   * Get author name for a post
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
   * Format popularity score for display
   */
  formatPopularity(score: number): string {
    if (score >= 1000) {
      return `${(score / 1000).toFixed(1)}K`;
    }
    return Math.round(score).toString();
  }
}
