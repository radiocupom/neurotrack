import { externalApiRequest } from "@/service/api";

export type ExternalAuthUser = {
  id: string;
  nome: string;
  email: string;
  papel: string;
};

export type LoginPayload = {
  email: string;
  senha: string;
};

export type ExternalLoginResponse = {
  message: string;
  token: string;
  usuario: ExternalAuthUser;
};

export function loginWithExternalApi(payload: LoginPayload) {
  return externalApiRequest<ExternalLoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function getAuthenticatedUserFromExternalApi(token: string) {
  return externalApiRequest<ExternalAuthUser>("/auth/me", {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}
