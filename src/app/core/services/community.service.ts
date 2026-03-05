import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreatePostRequest,
  CreateCommentRequest,
  ContentCheckRequest,
  Post,
  Comment,
  DiscussionCategory,
  PaginatedPosts,
  ModerationResult,
  BlockedWordsResponse
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
   * @returns Paginated posts sorted by creation date
   */
  getPosts(page?: number, size?: number, category?: DiscussionCategory): Observable<PaginatedPosts> {
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

    return this.http.get<PaginatedPosts>(`${this.baseUrl}/posts`, { params });
  }

  /**
   * Get trending posts sorted by popularity score
   * @param page Page number (0-based)
   * @param size Number of items per page
   * @returns Paginated posts sorted by popularity score (descending)
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
   * Like a post (increments like count)
   * @param id Post ID
   * @returns void
   */
  likePost(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/posts/${id}/like`, {});
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

  // ==================== MODERATION METHODS ====================

  /**
   * Check content for toxic/inappropriate language
   * @param content Text content to check
   * @returns Moderation result with detected words if toxic
   */
  checkContent(content: string): Observable<ModerationResult> {
    const request: ContentCheckRequest = { content };
    return this.http.post<ModerationResult>(`${this.baseUrl}/moderation/check`, request);
  }

  /**
   * Get list of supported languages for moderation
   * @returns Array of language codes (e.g., ['french', 'english'])
   */
  getModerationLanguages(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/moderation/languages`);
  }

  /**
   * Get blocked words list for a specific language
   * @param language Language code (e.g., 'french', 'english')
   * @returns Blocked words response with language, words array, and count
   */
  getBlockedWords(language: string): Observable<BlockedWordsResponse> {
    return this.http.get<BlockedWordsResponse>(`${this.baseUrl}/moderation/blocked-words/${language}`);
  }

  /**
   * Check content for toxicity with graceful error handling
   * Returns clean=true if the API fails (fail-open strategy)
   * @param content Text content to check
   * @returns Moderation result
   */
  checkContentSafe(content: string): Observable<ModerationResult> {
    return this.checkContent(content).pipe(
      catchError(() => of({ clean: true } as ModerationResult))
    );
  }
}
