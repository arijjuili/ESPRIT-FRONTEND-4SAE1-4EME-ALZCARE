import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommunityService } from '../../../../core/services/community.service';
import { ToastService } from '../../../../shared/components/toast/toast.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  Post,
  Comment,
  DiscussionCategory,
  CreateCommentRequest
} from '../../../../core/models/community.model';

@Component({
  selector: 'app-post-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './post-detail.component.html',
  styleUrls: ['./post-detail.component.scss'],
  providers: [ToastService]
})
export class PostDetailComponent implements OnInit {
  post: Post | null = null;
  comments: Comment[] = [];
  isLoadingPost = false;
  isLoadingComments = false;
  isSubmittingComment = false;
  error: string | null = null;
  
  // Form for creating new comments
  commentForm: FormGroup;
  
  // Categories configuration for display
  categories: { value: DiscussionCategory; label: string; icon: string }[] = [
    { value: 'ADVICE', label: 'Advice & Tips', icon: '💡' },
    { value: 'SUPPORT', label: 'Support & Encouragement', icon: '🤝' },
    { value: 'RESOURCES', label: 'Resources & Information', icon: '📚' },
    { value: 'SUCCESS_STORIES', label: 'Success Stories', icon: '🎉' },
    { value: 'QUESTIONS', label: 'Questions & Answers', icon: '❓' }
  ];

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

  /**
   * Load post details from the backend
   */
  loadPost(postId: string): void {
    this.isLoadingPost = true;
    this.error = null;
    
    this.communityService.getPost(postId).subscribe({
      next: (post: Post) => {
        this.post = post;
        this.isLoadingPost = false;
      },
      error: (err) => {
        console.error('Error loading post:', err);
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
    
    this.communityService.getComments(postId).subscribe({
      next: (comments: Comment[]) => {
        this.comments = comments;
        this.isLoadingComments = false;
      },
      error: (err) => {
        console.error('Error loading comments:', err);
        this.isLoadingComments = false;
        this.toastService.error('Failed to load comments. Please try again.', 'Load Error');
      }
    });
  }

  /**
   * Create a new comment on the post
   */
  createComment(): void {
    if (this.commentForm.invalid || !this.post) {
      this.toastService.warning('Please enter a valid comment.', 'Form Incomplete');
      return;
    }

    this.isSubmittingComment = true;
    
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

    this.communityService.createComment(request).subscribe({
      next: (newComment: Comment) => {
        // Add the new comment to the beginning of the list
        this.comments.unshift(newComment);
        
        // Increment comment count on the post
        if (this.post) {
          this.post.commentCount++;
        }
        
        // Reset form
        this.commentForm.reset();
        this.isSubmittingComment = false;
        
        this.toastService.success('Your comment has been posted successfully!', 'Comment Created');
      },
      error: (err) => {
        console.error('Error creating comment:', err);
        this.isSubmittingComment = false;
        const errorMessage = err.error?.detail || err.error?.message || 'Failed to post comment. Please try again.';
        this.toastService.error(errorMessage, 'Posting Error');
      }
    });
  }

  /**
   * Like the post
   */
  likePost(): void {
    if (!this.post) return;
    
    this.communityService.likePost(this.post.id).subscribe({
      next: () => {
        // Update the like count locally
        if (this.post) {
          this.post.likeCount++;
        }
        this.toastService.info('Post liked!', 'Thanks!');
      },
      error: (err) => {
        console.error('Error liking post:', err);
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
}
