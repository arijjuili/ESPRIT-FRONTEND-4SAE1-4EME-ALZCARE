import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CommunityService } from '../../../core/services/community.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  Post,
  DiscussionCategory,
  CreatePostRequest,
  PaginatedPosts
} from '../../../core/models/community.model';

@Component({
  selector: 'app-patient-community',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './patient-community.component.html',
  styleUrls: ['./patient-community.component.scss'],
  providers: [ToastService]
})
export class PatientCommunityComponent implements OnInit {
  posts: Post[] = [];
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  
  // Form for creating new posts
  postForm: FormGroup;
  showCreateForm = false;
  
  // Categories for the dropdown
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

  /**
   * Load posts from the backend
   */
  loadPosts(): void {
    this.isLoading = true;
    this.error = null;
    
    // Load first page of posts (10 per page)
    this.communityService.getPosts(0, 10).subscribe({
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
   * Toggle the create post form visibility
   */
  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm) {
      this.postForm.reset();
    }
  }

  /**
   * Create a new post
   */
  createPost(): void {
    if (this.postForm.invalid) {
      this.toastService.warning('Please fill in all required fields.', 'Form Incomplete');
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
        
        this.toastService.success('Your post has been created successfully!', 'Post Created');
      },
      error: (err: any) => {
        console.error('Error creating post:', err);
        this.isSubmitting = false;
        const errorMessage = err.error?.detail || err.error?.message || 'Failed to create post. Please try again.';
        this.toastService.error(errorMessage, 'Creation Error');
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
    // For now, return the userId directly. In a real implementation, you could:
    // 1. Call an identity service to get user profiles
    // 2. Store user names in the Post model itself
    // 3. Cache user names after first fetch
    return post.createdBy;
  }

  /**
   * Check if the form has unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.showCreateForm && this.postForm.dirty && !this.postForm.pristine;
  }
}
