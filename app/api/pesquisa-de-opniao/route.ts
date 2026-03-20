import { NextResponse } from "next/server";

import { criarPesquisa, listarPesquisas } from "@/service/pesquisa-opiniao.service";
import type { CriarPesquisaOpiniaoPayload } from "@/types/pesquisa-opiniao";
import { requirePesquisaAdminSession, requirePesquisaSession } from "@/app/api/pesquisa-de-opniao/_utils";

export async function GET() {
  const { token, response } = await requirePesquisaSession();
  if (response || !token) {
    return response as NextResponse;
  }

  const result = await listarPesquisas(token);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data ?? [], { status: 200 });
}

export async function POST(request: Request) {
  const { token, response, session } = await requirePesquisaAdminSession();
  if (response || !token || !session) {
    return response as NextResponse;
  }

  const body = (await request.json().catch(() => null)) as CriarPesquisaOpiniaoPayload | null;
  if (!body || typeof body.titulo !== "string" || !Array.isArray(body.perguntas?.create)) {
    return NextResponse.json({ message: "Payload invalido para criacao de pesquisa." }, { status: 400 });
  }

  const payload: CriarPesquisaOpiniaoPayload = {
    ...body,
    criadoPorId: body.criadoPorId || session.user.id,
  };

  const result = await criarPesquisa(token, payload);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data, { status: result.status || 201 });
}
