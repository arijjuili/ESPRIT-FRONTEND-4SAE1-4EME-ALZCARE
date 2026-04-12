import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommunityService } from '../../../../core/services/community.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToxicityWarningComponent } from '../../../../shared/components/toxicity-warning/toxicity-warning.component';
import {
  Post,
  Comment,
  DiscussionCategory,
  CreateCommentRequest
} from '../../../../core/models/community.model';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ToxicityWarningComponent],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss'],
  providers: [ToastService]
})
export class PostDetailComponent implements OnInit, OnDestroy {
  post: Post | null = null;
  comments: Comment[] = [];
  isLoadingPost = false;
  isLoadingComments = false;
  isSubmittingComment = false;
  error: string | null = null;
  
  // Form for creating new comments
  commentForm: FormGroup;
  
  // Toxicity warning
  showToxicityWarning = false;
  detectedToxicWords: string[] = [];
  
  // Categories configuration for display
  categories: { value: DiscussionCategory; label: string; icon: string }[] = [
    { value: 'ADVICE', label: 'Advice & Tips', icon: '💡' },
    { value: 'SUPPORT', label: 'Support & Encouragement', icon: '🤝' },
    { value: 'RESOURCES', label: 'Resources & Information', icon: '📚' },
    { value: 'SUCCESS_STORIES', label: 'Success Stories', icon: '🎉' },
    { value: 'QUESTIONS', label: 'Questions & Answers', icon: '❓' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private communityService: CommunityService,
    private toastService: ToastService,
    private authService: AuthService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router
  ) {
    // Initialize the comment form
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    // Get post ID from route parameters
    const postId = this.route.snapshot.paramMap.get('id');
    if (postId) {
      this.loadPost(postId);
      this.loadComments(postId);
    } else {
      this.error = 'Invalid post ID';
      this.toastService.error('Invalid post ID', 'Error');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load post details from the backend
   */
  loadPost(postId: string): void {
    this.isLoadingPost = true;
    this.error = null;
    
    this.communityService.getPost(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post: Post) => {
          this.post = post;
          this.isLoadingPost = false;
        },
        error: () => {
          this.error = 'Failed to load post details. Please try again.';
          this.isLoadingPost = false;
          this.toastService.error(this.error, 'Load Error');
        }
      });
  }

  /**
   * Load comments for the post from the backend
   */
  loadComments(postId: string): void {
    this.isLoadingComments = true;
    
    this.communityService.getComments(postId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (comments: Comment[]) => {
          this.comments = comments;
          this.isLoadingComments = false;
        },
        error: () => {
          this.isLoadingComments = false;
          this.toastService.error('Failed to load comments. Please try again.', 'Load Error');
        }
      });
  }

  /**
   * Check comment content for toxicity before submitting
   */
  checkContentBeforeSubmit(): void {
    if (this.commentForm.invalid || !this.post) {
      this.toastService.warning('Please enter a valid comment.', 'Form Incomplete');
      return;
    }

    const content = this.commentForm.get('content')?.value || '';
    this.isSubmittingComment = true;

    // Check content for toxicity
    this.communityService.checkContent(content)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result.toxic) {
            // Content is clean, proceed with submission
            this.submitComment();
          } else {
            // Toxic content detected
            this.isSubmittingComment = false;
            this.showToxicityWarning = true;
            this.detectedToxicWords = result.detectedWords;
            this.toastService.warning('Please review your comment before posting.', 'Content Warning');
          }
        },
        error: () => {
          // If moderation check fails, still try to submit
          // Backend will do final validation
          this.submitComment();
        }
      });
  }

  /**
   * Submit the comment
   */
  private submitComment(): void {
    if (!this.post) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.toastService.error('You must be logged in to post a comment.', 'Authentication Required');
      this.isSubmittingComment = false;
      return;
    }

    const request: CreateCommentRequest = {
      content: this.commentForm.get('content')?.value,
      postId: this.post.id,
      userId: currentUser.id
    };

    this.communityService.createComment(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newComment: Comment) => {
          // Add the new comment to the beginning of the list
          this.comments.unshift(newComment);
          
          // Increment comment count on the post
          if (this.post) {
            this.post.commentCount++;
            // Update popularity score (comments are weighted 5x)
            this.post.popularityScore += 5;
          }
          
          // Reset form
          this.commentForm.reset();
          this.isSubmittingComment = false;
          this.showToxicityWarning = false;
          
          this.toastService.success('Your comment has been posted successfully!', 'Comment Created');
        },
        error: (err) => {
          this.isSubmittingComment = false;
          
          // Check if it's a toxicity error
          if (err.status === 400 && err.error?.detectedWords) {
            this.showToxicityWarning = true;
            this.detectedToxicWords = err.error.detectedWords;
            this.toastService.error('Your comment contains inappropriate language.', 'Content Rejected');
          } else {
            const errorMessage = err.error?.detail || err.error?.message || 'Failed to post comment. Please try again.';
            this.toastService.error(errorMessage, 'Posting Error');
          }
        }
      });
  }

  /**
   * Create a new comment on the post (public method)
   */
  createComment(): void {
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
    // Focus on content field
    const contentField = document.getElementById('comment-content');
    if (contentField) {
      contentField.focus();
    }
  }

  /**
   * Like the post
   */
  likePost(): void {
    if (!this.post) return;
    
    this.communityService.likePost(this.post.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Update the like count locally
          if (this.post) {
            this.post.likeCount++;
            // Update popularity score (likes are weighted 2x)
            this.post.popularityScore += 2;
          }
          this.toastService.info('Post liked!', 'Thanks!');
        },
        error: () => {
          this.toastService.error('Failed to like post. Please try again.', 'Error');
        }
      });
  }

  /**
   * Navigate back to the community page
   */
  goBack(): void {
    this.router.navigate(['/patient/community']);
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
      if (diffInDays < 30) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
      } else {
        const diffInMonths = Math.floor(diffInDays / 30);
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
      }
    }
  }

  /**
   * Check if the current user is the author of the post
   */
  isPostAuthor(post: Post): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? post.createdBy === currentUser.id : false;
  }

  /**
   * Check if the current user is the author of the comment
   */
  isCommentAuthor(comment: Comment): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? comment.userId === currentUser.id : false;
  }

  /**
   * Retry loading after an error
   */
  retryLoad(): void {
    const postId = this.route.snapshot.paramMap.get('id');
    if (postId) {
      this.loadPost(postId);
      this.loadComments(postId);
    }
  }

  /**
   * Get the submit button text for comment form
   */
  getSubmitButtonText(): string {
    return this.isSubmittingComment ? 'Posting...' : 'Post Comment';
  }

  /**
   * Get the number of comments text
   */
  getCommentCountText(): string {
    if (!this.post) return 'Comments';
    const count = this.post.commentCount;
    return `${count} comment${count !== 1 ? 's' : ''}`;
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

  /**
   * Calculate freshness score for display
   * Returns max(0, 100 - hoursSincePost)
   */
  getFreshnessScore(creationDate: string): number {
    const date = new Date(creationDate);
    const now = new Date();
    const hoursSincePost = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    return Math.max(0, 100 - hoursSincePost);
  }

  /**
   * Calculate estimated views based on popularity
   */
  getEstimatedViews(popularityScore: number): number {
    return popularityScore * 3 + 10;
  }
}
