/**
 * Community Forum Models
 * 
 * TypeScript interfaces for the community forum discussion features.
 */

// ==================== ENUMS (String Literal Unions) ====================

export type DiscussionCategory = 
  | 'ADVICE' 
  | 'SUPPORT' 
  | 'RESOURCES' 
  | 'SUCCESS_STORIES' 
  | 'QUESTIONS';

// ==================== REQUEST DTOs ====================

export interface CreatePostRequest {
  title: string;
  content: string;
  category: DiscussionCategory;
  createdBy: string; // User ID of the author
  parentId?: string; // Used for replies to existing posts
}

export interface CreateCommentRequest {
  content: string;
  postId: string;
  userId: string; // User ID of the comment author
}

export interface ContentCheckRequest {
  content: string;
}

// ==================== INTERFACE MODELS ====================

export interface Post {
  id: string;
  title: string;
  content: string;
  category: DiscussionCategory;
  parentId?: string; // Null for top-level posts, set for replies
  createdBy: string; // User ID of the author
  creationDate: string; // ISO datetime
  likeCount: number;
  popularityScore: number; // Calculated: (likes × 2) + (comments × 5) + freshness
  commentCount: number;
}

export interface Comment {
  id: string;
  content: string;
  creationDate: string; // ISO datetime
  userId: string; // User ID of the comment author
}

// ==================== PAGINATION ====================

export interface PaginatedPosts {
  content: Post[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ==================== MODERATION ====================

export interface ModerationResult {
  clean: boolean;
  detectedWords?: string[];
  language?: string;
}

export interface ToxicContentError {
  type: string;
  title: string;
  status: number;
  detail: string;
  detectedWords: string[];
  timestamp: string;
}

export interface BlockedWordsResponse {
  language: string;
  words: string[];
  count: number;
}
