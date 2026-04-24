import type { UserRole } from "../db/schema/users";

export interface JwtAccessPayload {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export interface JwtRefreshPayload {
  sub: string;
  sid: string;
  familyId: string;
  iat: number;
  exp: number;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  language: string;
  currency: string;
}
