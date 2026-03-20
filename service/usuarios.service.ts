import { externalApiRequest } from "@/service/api";
import type { UserRole } from "@/lib/auth/types";

export type ExternalUsuario = {
  id: string;
  nome: string;
  email: string;
  papel: UserRole;
  ativo?: boolean;
  isAtivo?: boolean;
};

export type CreateUsuarioPayload = {
  nome: string;
  email: string;
  senha: string;
  papel: UserRole;
  ativo: boolean;
};

export type UpdateUsuarioPayload = {
  nome: string;
  email: string;
  senha?: string;
  papel: UserRole;
  ativo: boolean;
};

export function listarUsuariosFromExternalApi(token: string) {
  return externalApiRequest<ExternalUsuario[]>("/usuarios", {
    method: "GET",
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function cadastrarUsuarioOnExternalApi(token: string, payload: CreateUsuarioPayload) {
  return externalApiRequest<ExternalUsuario>("/usuarios", {
    method: "POST",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}

export function editarUsuarioOnExternalApi(token: string, id: string, payload: UpdateUsuarioPayload) {
  return externalApiRequest<ExternalUsuario>(`/usuarios/${id}`, {
    method: "PUT",
    body: payload,
    token,
    requiresAuth: true,
    requiresPrivateToken: true,
  });
}
