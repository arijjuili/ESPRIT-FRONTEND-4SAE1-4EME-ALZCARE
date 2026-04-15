import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePostRequest,
  CreateCommentRequest,
  Post,
  Comment,
  DiscussionCategory,
  PaginatedPosts,
  PostSortOption,
  ContentCheckRequest,
  ContentCheckResponse,
  BlockedWordsList,
  SupportedLanguages
} from '../models/community.model';

/**
 * Community Service
 *
 * Handles communication with the Community Social Service for forum functionality.
 * All endpoints are proxied through the API Gateway.
 * JWT authentication is handled automatically via AuthInterceptor.
 */
@Injectable({
  providedIn: 'root'
})
export class CommunityService {
  private baseUrl = `${environment.apiUrl}/community/api/v1`;

  constructor(private http: HttpClient) { }

  // ==================== POST METHODS ====================

  /**
   * Get posts with pagination and optional category filtering
   * @param page Page number (0-based)
   * @param size Number of items per page
   * @param category Optional category filter
   * @param sort Optional sort option (NEWEST, TRENDING, MOST_LIKED, MOST_COMMENTED)
   * @returns Paginated posts
   */
  getPosts(
    page?: number, 
    size?: number, 
    category?: DiscussionCategory,
    sort?: PostSortOption
  ): Observable<PaginatedPosts> {
    let params = new HttpParams();

    if (page !== undefined && page !== null) {
      params = params.set('page', page.toString());
    }
    if (size !== undefined && size !== null) {
      params = params.set('size', size.toString());
    }
    if (category) {
      params = params.set('category', category);
    }

    // Use different endpoint based on sort option
    if (sort === 'TRENDING') {
      return this.http.get<PaginatedPosts>(`${this.baseUrl}/posts/trending`, { params });
    }
    
    // For other sort options, add sort parameter
    if (sort && sort !== 'NEWEST') {
      const sortMapping: Record<string, string> = {
        'MOST_LIKED': 'likeCount,desc',
        'MOST_COMMENTED': 'commentCount,desc'
      };
      params = params.set('sort', sortMapping[sort] || 'creationDate,desc');
    }

    return this.http.get<PaginatedPosts>(`${this.baseUrl}/posts`, { params });
  }

  /**
   * Get trending posts sorted by popularity score
   * @param page Page number (0-based)
   * @param size Number of items per page
   * @returns Paginated posts sorted by popularity
   */
  getTrendingPosts(page?: number, size?: number): Observable<PaginatedPosts> {
    let params = new HttpParams();

    if (page !== undefined && page !== null) {
      params = params.set('page', page.toString());
    }
    if (size !== undefined && size !== null) {
      params = params.set('size', size.toString());
    }

    return this.http.get<PaginatedPosts>(`${this.baseUrl}/posts/trending`, { params });
  }

  /**
   * Get a single post by ID
   * @param id Post ID
   * @returns Post details
   */
  getPost(id: string): Observable<Post> {
    return this.http.get<Post>(`${this.baseUrl}/posts/${id}`);
  }

  /**
   * Create a new post
   * @param request Post creation request
   * @returns Created post
   */
  createPost(request: CreatePostRequest): Observable<Post> {
    return this.http.post<Post>(`${this.baseUrl}/posts`, request);
  }

  /**
   * Update an existing post
   * @param id Post ID
   * @param request Post update request
   * @returns Updated post
   */
  updatePost(id: string, request: Partial<CreatePostRequest>): Observable<Post> {
    return this.http.put<Post>(`${this.baseUrl}/posts/${id}`, request);
  }

  /**
   * Like a post (increments like count)
   * @param id Post ID
   * @returns void
   */
  likePost(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/posts/${id}/like`, {});
  }

  /**
   * Delete a post
   * @param id Post ID
   * @returns void
   */
  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/posts/${id}`);
  }

  // ==================== COMMENT METHODS ====================

  /**
   * Get all comments for a specific post
   * @param postId Post ID
   * @returns List of comments
   */
  getComments(postId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/comments/post/${postId}`);
  }

  /**
   * Create a new comment on a post
   * @param request Comment creation request
   * @returns Created comment
   */
  createComment(request: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(`${this.baseUrl}/comments`, request);
  }

  /**
   * Update an existing comment
   * @param id Comment ID
   * @param content New content
   * @returns Updated comment
   */
  updateComment(id: string, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/comments/${id}`, { content });
  }

  /**
   * Delete a comment
   * @param id Comment ID
   * @returns void
   */
  deleteComment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/comments/${id}`);
  }

  // ==================== CONTENT MODERATION METHODS ====================

  /**
   * Check content for toxic words before submitting
   * @param content Text content to check
   * @returns Content check result with detected words
   */
  checkContent(content: string): Observable<ContentCheckResponse> {
    const request: ContentCheckRequest = { content };
    return this.http.post<ContentCheckResponse>(`${this.baseUrl}/moderation/check`, request);
  }

  /**
   * Get list of supported languages for moderation
   * @returns List of supported language codes
   */
  getSupportedLanguages(): Observable<SupportedLanguages> {
    return this.http.get<SupportedLanguages>(`${this.baseUrl}/moderation/languages`);
  }

  /**
   * Get blocked words for a specific language
   * @param lang Language code ('french' or 'english')
   * @returns List of blocked words
   */
  getBlockedWords(lang: 'french' | 'english'): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/moderation/blocked-words/${lang}`);
  }
}
