export interface UserPublic {
  id: string;
  email: string;
  googleId: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  themePreference: string;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
}
