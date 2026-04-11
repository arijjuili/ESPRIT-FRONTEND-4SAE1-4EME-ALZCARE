// Gender Enum
export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

// Language Enum
export enum LanguageEnum {
  ARABIC = 'ARABIC',
  FRENCH = 'FRENCH',
  ENGLISH = 'ENGLISH'
}

// Autonomy Level Enum
export enum AutonomyLevel {
  INDEPENDENT = 'INDEPENDENT',
  ASSISTED = 'ASSISTED',
  DEPENDENT = 'DEPENDENT'
}

// Memory Category Enum
export enum MemoryCategory {
  FAMILY = 'FAMILY',
  FRIENDS = 'FRIENDS',
  PLACES = 'PLACES',
  EVENTS = 'EVENTS',
  HOBBIES = 'HOBBIES',
  WORK = 'WORK'
}

// Health Record Type Enum
export enum RecordType {
  ASSESSMENT = 'ASSESSMENT',
  DAILY_CHECKIN = 'DAILY_CHECKIN',
  PROGRESS = 'PROGRESS'
}

// Patient Profile Response
export interface PatientProfile {
  id: string;
  keycloakId: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date format YYYY-MM-DD
  gender: GenderEnum;
  preferredLanguage: LanguageEnum;
  culturalContext?: string;
  photoUrl?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  isActive: boolean;
  doctorUserId?: string;
  totalPoints?: number;
  currentStreak?: number;
  lastPlayedDate?: string;
  assistedModeActive?: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

// Patient Create Request
export interface PatientCreateRequest {
  keycloakId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date format YYYY-MM-DD
  gender: GenderEnum;
  preferredLanguage?: LanguageEnum;
  culturalContext?: string;
  photoUrl?: string;
}

// Patient Update Request (for admin)
export interface PatientUpdateRequest {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: GenderEnum;
  preferredLanguage?: LanguageEnum;
  photoUrl?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  isActive: boolean;
  totalPoints?: number;
  currentStreak?: number;
  lastPlayedDate?: string;
  assistedModeActive?: boolean;
}

// Doctor Profile Response
export interface DoctorProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  speciality: string;
  licenseNumber: string;
  phone: string;
  contact?: string;
  address?: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

// Caregiver Profile Response
export interface CaregiverProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  phone: string;
  address?: string;
  contact?: string;
  isAvailable: boolean;
  isProfessional: boolean;
  createdAt: string;
  updatedAt: string;
}

// Doctor Update Request (for admin)
export interface DoctorUpdateRequest {
  firstName: string;
  lastName: string;
  photoUrl?: string;
  speciality?: string;
  licenseNumber?: string;
  phone?: string;
  contact?: string;
  address?: string;
  isAvailable?: boolean;
}

// Caregiver Update Request (for admin)
export interface CaregiverUpdateRequest {
  firstName: string;
  lastName: string;
  photoUrl?: string;
  phone?: string;
  address?: string;
  contact?: string;
  isAvailable?: boolean;
  isProfessional?: boolean;
}

// Union type for any profile
export type UserProfile = PatientProfile | DoctorProfile | CaregiverProfile;

// Autonomy Assessment
export interface AutonomyAssessment {
  id: string;
  patientId: string;
  hygieneLevel: AutonomyLevel;
  medicationLevel: AutonomyLevel;
  mobilityLevel: AutonomyLevel;
  feedingLevel: AutonomyLevel;
  overallScore: number; // 4-12 calculated
  notes?: string;
  assessedAt: string;
}

// Autonomy Assessment Request
export interface AutonomyAssessmentRequest {
  hygieneLevel: AutonomyLevel;
  medicationLevel: AutonomyLevel;
  mobilityLevel: AutonomyLevel;
  feedingLevel: AutonomyLevel;
  notes?: string;
}

// Health Record Response
export interface HealthRecord {
  id: string;
  patientId: string;
  doctorUserId?: string;
  recordType: RecordType;
  date: string;
  nextDueDate?: string;
  frequencyMonths?: number;
  checkInFrequencyHours?: number;
  isActive?: boolean;
  completedAt?: string;
  assessmentType?: string;
  googleFormUrl?: string;
  assessmentQuestions?: string[];
  responses?: Record<string, unknown>;
  domainScores?: Record<string, unknown>;
  doctorNotes?: string;
  mood?: number;
  confusion?: number;
  memory?: number;
  sleep?: number;
  appetite?: number;
  checkInNotes?: string;
  flaggedForDoctor?: boolean;
  unifiedScore?: number;
  declineRatePercent?: number;
  memoryScore?: number;
  attentionScore?: number;
  languageScore?: number;
  neurospatialScore?: number;
  executiveScore?: number;
  reviewedScore?: number;
  reviewedAnswers?: Record<string, boolean>;
}

// Health Record Create Request
export interface HealthRecordCreateRequest {
  patientId: string;
  doctorUserId?: string;
  recordType: RecordType;
  date: string;
  nextDueDate?: string;
  frequencyMonths?: number;
  checkInFrequencyHours?: number;
  isActive?: boolean;
  completedAt?: string;
  assessmentType?: string;
  assessmentQuestions?: string[];
  responses?: Record<string, unknown>;
  domainScores?: Record<string, unknown>;
  doctorNotes?: string;
  mood?: number;
  confusion?: number;
  memory?: number;
  sleep?: number;
  appetite?: number;
  checkInNotes?: string;
  flaggedForDoctor?: boolean;
  unifiedScore?: number;
}

export interface AssessmentSubmissionRequest {
  responses?: Record<string, unknown>;
  domainScores?: Record<string, unknown>;
  unifiedScore?: number;
  doctorNotes?: string;
}

export interface DailyCheckInStatus {
  patientId: string;
  checkInFrequencyHours: number;
  lastCheckInDate?: string;
  hoursSinceLastCheckIn?: number;
  currentStreak: number;
  missedDays: number;
  completedToday: boolean;
  dueNow: boolean;
  overdue: boolean;
}

export interface PatientDailyCheckInRequest {
  patientId: string;
  mood?: number;
  sleep?: number;
  appetite?: number;
  skipped?: boolean;
}

export interface CaregiverDailyCheckInRequest {
  patientId: string;
  caregiverUserId: string;
  confusion?: number;
  memory?: number;
  checkInNotes?: string;
}

// Memory Item Response
export interface MemoryItem {
  id: string;
  patientId: string;
  memoryCategory: MemoryCategory;
  title: string;
  description?: string;
  imageUrl?: string | null;
  location?: string;
  yearTaken?: number;
  persons?: string[];
  questions?: string[];
  correctAnswers?: string[];
  storybookSelected: boolean;
  createdAt: string;
}

// Memory Item Create Request
export interface MemoryItemCreateRequest {
  patientId: string;
  memoryCategory: MemoryCategory;
  title: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  yearTaken: number;
  persons?: string[];
  questions?: string[];
  correctAnswers?: string[];
  storybookSelected?: boolean;
  createdAt: string;
}

// Memory Item Update Request
export interface MemoryItemUpdateRequest {
  patientId?: string;
  memoryCategory?: MemoryCategory;
  title?: string;
  description?: string;
  imageUrl?: string;
  location?: string;
  yearTaken?: number;
  persons?: string[];
  questions?: string[];
  correctAnswers?: string[];
  storybookSelected?: boolean;
  createdAt?: string;
}

export interface MemoryConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface MemoryConversationRequest {
  patientId: string;
  prompt: string;
  conversationHistory?: MemoryConversationTurn[];
}

export interface MemoryConversationCitation {
  memoryItemId: string;
  title: string;
  memoryCategory?: string;
  description?: string;
  location?: string;
  yearTaken?: number;
  persons?: string[];
}

export interface MemoryConversationResponse {
  answer: string;
  provider: string;
  citedItems: MemoryConversationCitation[];
  suggestedPrompts: string[];
}

export interface MemoryStorybookRequest {
  patientId: string;
}

export interface MemoryStoryScene {
  memoryItemId: string;
  headline: string;
  storyText: string;
  imageUrl?: string;
  accent?: string;
}

export interface MemoryStorybookResponse {
  title: string;
  introduction: string;
  closingMessage: string;
  provider: string;
  selectedCount: number;
  generatedAt: string;
  scenes: MemoryStoryScene[];
}

// Quiz Attempt Response
export interface QuizAttempt {
  id: string;
  patientId: string;
  memoryItemId: string;
  attemptDate: string;
  questionAsked: string;
  correctAnswer: string;
  patientAnswer?: string;
  isCorrect?: boolean;
  responseTimeSeconds?: number;
}

// Quiz Attempt Create Request
export interface QuizAttemptCreateRequest {
  patientId: string;
  memoryItemId: string;
  attemptDate: string;
  questionAsked: string;
  correctAnswer: string;
  patientAnswer?: string;
  isCorrect?: boolean;
  responseTimeSeconds?: number;
}

// Quiz Attempt Answer Request
export interface QuizAttemptAnswerRequest {
  patientAnswer: string;
  responseTimeSeconds?: number;
  attemptDate?: string;
}

// Game Catalog
export type GameType =
  | 'MEMORY_MATCH'
  | 'PATTERN_RECOGNITION'
  | 'WORD_RECALL'
  | 'SPATIAL_NAVIGATION'
  | 'ATTENTION_TASK';

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameCatalogItem {
  gameType: GameType;
  name: string;
  description: string;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  icon: string;
}

export interface GameActivity {
  id: string;
  patientId: string;
  gameType: GameType;
  difficulty: DifficultyLevel;
  targetDomain: string;
  createdAt: string;
  completedAt?: string;
  score?: number;
  maxScore?: number;
  durationSeconds?: number;
  voiceUsed?: boolean;
  hintsUsed?: number;
  mistakesMade?: number;
  pointsEarned?: number;
  dailyChallengeCompleted?: boolean;
  badgeEarned?: string;
  badgeDescription?: string;
  badgeIconUrl?: string;
  badgePoints?: number;
  adaptiveMode?: boolean;
  difficultyAdjustments?: number;
  voiceCommandCount?: number;
  accuracyPercent?: number;
}

export interface GameActivityCreateRequest {
  patientId: string;
  gameType: GameType;
  difficulty: DifficultyLevel;
  targetDomain: string;
  createdAt?: string;
  completedAt?: string;
  score?: number;
  maxScore?: number;
  durationSeconds?: number;
  voiceUsed?: boolean;
  hintsUsed?: number;
  mistakesMade?: number;
  pointsEarned?: number;
  dailyChallengeCompleted?: boolean;
  badgeEarned?: string;
  badgeDescription?: string;
  badgeIconUrl?: string;
  badgePoints?: number;
  adaptiveMode?: boolean;
  difficultyAdjustments?: number;
  voiceCommandCount?: number;
  accuracyPercent?: number;
}

export interface GameAdaptationProfile {
  patientId: string;
  gameType: GameType;
  recommendedDifficulty: DifficultyLevel;
  assistedMode: boolean;
  hintLevel: number;
  timeMultiplier: number;
  cueMode: string;
  breakSuggestion: boolean;
  reason: string;
}

export interface GamificationSummary {
  patientId: string;
  totalPoints: number;
  level: number;
  streak: number;
  badgesEarned: number;
  dailyChallengesCompleted: number;
  lastActivityAt?: string;
}

export interface GamificationBadgeEvent {
  patientId: string;
  patientName: string;
  gameType: GameType;
  badgeEarned: string;
  badgeDescription?: string;
  badgeIconUrl?: string;
  earnedAt: string;
}

export interface GamificationLeaderboardEntry {
  patientId: string;
  patientName: string;
  totalPoints: number;
  level: number;
  badgesCount: number;
  streak: number;
  rankPosition: number;
  percentile: number;
}

export interface GamificationDailyChallenge {
  patientId: string;
  date: string;
  gameType: GameType;
  difficulty: DifficultyLevel;
  targetScore: number;
  completed: boolean;
  description: string;
}

// Keycloak Token Response
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

// Keycloak User Info from JWT
export interface KeycloakUserInfo {
  sub: string;
  preferred_username?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  // Roles from protocol mapper (oidc-usermodel-realm-role-mapper)
  roles?: string[];
  realm_access?: {
    roles: string[];
  };
  resource_access?: {
    [key: string]: {
      roles: string[];
    };
  };
}

// API Error Response
export interface ApiError {
  status: number;
  message: string;
  details?: string;
  timestamp?: string;
}

// Token State for tracking token expiration
export interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;      // Unix timestamp in seconds
  issuedAt: number;       // Unix timestamp in seconds
}

// Token Refresh Event for refresh event notifications
export interface TokenRefreshEvent {
  success: boolean;
  accessToken?: string;
  error?: string;
  timestamp: number;
}

// Refresh Token Request body for token refresh
export interface RefreshTokenRequest {
  grant_type: 'refresh_token';
  client_id: string;
  refresh_token: string;
}

// JWT Payload for decoded JWT structure
export interface JwtPayload {
  sub: string;
  exp: number;
  iat: number;
  iss?: string;
  aud?: string;
  [key: string]: any;
}
