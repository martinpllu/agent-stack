import type { User as DbUser, NewUser as DbNewUser } from "~/db/schema";

/**
 * Base user interface with all database properties
 * This represents the complete user object as stored in the database
 */
export interface User extends DbUser {
  id: string;
  email: string;
  lastLogin: Date | null;
  isAdmin: boolean;
  isValidated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User object for new user creation
 * Matches the database NewUser type with optional properties
 */
export interface NewUser extends DbNewUser {
  email: string;
  isAdmin?: boolean;
  isValidated?: boolean;
}

/**
 * Flattened user interface for API responses and UI components
 * This is the simplified version returned by auth functions after flattening
 */
export interface FlatUser {
  id: string;
  email: string;
  isAdmin: boolean;
  isValidated: boolean;
}

/**
 * User profile information for display purposes
 * Includes additional optional properties that may be shown to users
 */
export interface UserProfile extends FlatUser {
  lastLogin?: Date | null;
  createdAt?: Date;
}

/**
 * User role types for authorization
 */
export type UserRole = "user" | "admin";

/**
 * Type guard to check if a user object has admin privileges
 */
export function isAdmin(user: FlatUser | User): boolean {
  return user.isAdmin === true;
}

/**
 * Type guard to check if a user account is validated
 */
export function isValidated(user: FlatUser | User): boolean {
  return user.isValidated === true;
}

/**
 * Converts a full User object to a FlatUser for API responses
 */
export function toFlatUser(user: User): FlatUser {
  return {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    isValidated: user.isValidated,
  };
}

/**
 * Converts a full User object to a UserProfile for display
 */
export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    isValidated: user.isValidated,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
}