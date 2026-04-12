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

export type PostSortOption = 'NEWEST' | 'TRENDING' | 'MOST_LIKED' | 'MOST_COMMENTED';

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
  popularityScore: number; // Calculated based on likes, recency, etc.
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

// ==================== CONTENT MODERATION ====================

export interface ContentCheckResponse {
  toxic: boolean;
  toxicityScore: number;
  detectedWords: string[];
  message: string;
}

export interface BlockedWordsList {
  french: string[];
  english: string[];
}

export interface SupportedLanguages {
  languages: string[];
}
