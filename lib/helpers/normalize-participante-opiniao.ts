/**
 * Helper para normalização de Participante
 * Padroniza respostas que podem vir com 'id' ou 'participanteId'
 * Centraliza lógica de normalização conforme regra do projeto
 */

import type { Participante, ParticipanteNormalizado } from "@/types/pesquisa-opiniao";

/**
 * Normaliza participante bruto (vindo da API) para formato padronizado
 * 
 * Regra: idFinal = data.participanteId || data.id
 * Regra: contato = data.telefone || data.contatoOpcional
 * 
 * @param data - Participante bruto da API
 * @returns Participante normalizado
 */
export function normalizarParticipante(data: unknown): ParticipanteNormalizado | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;

  // Extrair ID (aceitar participanteId ou id)
  const idFinal = 
    (typeof raw.participanteId === "string" ? raw.participanteId : null) ||
    (typeof raw.id === "string" ? raw.id : null);

  if (!idFinal) {
    return null;
  }

  // Extrair nome
  const nome = typeof raw.nome === "string" ? raw.nome.trim() : "";
  if (!nome) {
    return null;
  }

  // Extrair email (opcional)
  const email = typeof raw.email === "string" ? raw.email.trim() || null : null;

  // Extrair contato (aceitar telefone ou contatoOpcional)
  const contato =
    (typeof raw.telefone === "string" ? raw.telefone.trim() : null) ||
    (typeof raw.contatoOpcional === "string" ? raw.contatoOpcional.trim() : null) ||
    null;

  return {
    id: idFinal,
    nome,
    email,
    contato,
  };
}

/**
 * Normaliza lista de participantes
 */
export function normalizarParticipantes(data: unknown): ParticipanteNormalizado[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item) => normalizarParticipante(item))
    .filter((item) => item !== null) as ParticipanteNormalizado[];
}

/**
 * Valida se um participante normalizado tem dados mínimos
 */
export function validarParticipante(p: ParticipanteNormalizado | null): boolean {
  if (!p) return false;
  return Boolean(p.id && p.nome);
}

/**
 * Helper para extrair telefone formatado (remove caracteres especiais)
 */
export function formatarTelefone(telefone: string): string {
  return telefone.replace(/\D/g, "");
}

/**
 * Valida telefone com padrão brasileiro (11 dígitos)
 */
export function validarTelefoneBrasileiro(telefone: string): boolean {
  const apenas_numeros = formatarTelefone(telefone);
  return apenas_numeros.length === 11; // DDD (2) + número (9)
}
