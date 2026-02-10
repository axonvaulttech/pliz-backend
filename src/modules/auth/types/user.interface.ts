/**
 * =====================================================
 * AUTHENTICATION TYPES
 * =====================================================
 */

/**
 * User interface
 */
export interface IUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date | null; // Nullable
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Registration Request
 */
export interface IRegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Login Request
 */
export interface ILoginRequest {
  email: string;
  password: string;
}



/**typescript/**
 * User response interface (for API responses)
 */
export interface IUserResponse {
  id: string;
  username: string;
  email: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: Date | null; // ← Add this line
  createdAt?: Date;              // ← Add this line
  updatedAt?: Date;              // ← Add this line
}

/**
 * JWT Payload interface
 */
export interface IJWTPayload {
  userId: string;     
  email: string;      
  type: 'access' | 'refresh';
  sessionId?: string;  
  iat?: number;
  exp?: number;
}

/**
 * Forgot Password Request
 */
export interface IForgotPasswordRequest {
  email: string;
}

/**
 * Password Reset Request
 */
export interface IPasswordResetRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change Password Request
 */
export interface IChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Refresh Token Request
 */
export interface IRefreshTokenRequest {
  refreshToken: string;
}

/**
 * API Response Interface
 */
export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * =====================================================
 * SESSION MANAGEMENT TYPES: For multi-session management
  * =====================================================
 */

/**
 * Session Interface
 */
export interface ISession {
  id: string;
  userId: string;
  deviceInfo: {
    userAgent: string;
    browser: string;
    os: string;
    device: string;
  };
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
  };
  active: boolean;
  lastActive: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Session Response
 */
export interface ISessionResponse {
  id: string;
  deviceInfo: {
    userAgent: string;
    browser: string;
    os: string;
    device: string;
    
  };
  ipAddress: string;
  location?: {
    country?: string;
    city?: string;
  };
  active: boolean;
  isCurrent?: boolean;
  lastActive: Date;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Device Info
 */
export interface IDeviceInfo {
  userAgent: string;
  browser: string;
  os: string;
  device: string;
}