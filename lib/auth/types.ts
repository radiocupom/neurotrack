export type UserRole = "SUPERADMIN" | "ADMIN" | "ENTREVISTADOR" | (string & {});

export type AuthUser = {
  id: string;
  nome: string;
  email: string;
  papel: UserRole;
};

export type SessionPayload = {
  user: AuthUser;
  token: string;
  expiresAt: number;
};
