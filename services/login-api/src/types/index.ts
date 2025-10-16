export type UserProfile = {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
  createdAt: string;
  lastLoginAt: string;
};

export type SessionTokenPayload = {
  userId: string;
};
