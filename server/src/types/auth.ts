export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  themePreference: string;
  createdAt: Date;
}

export interface JwtPayload {
  userId: string;
}
