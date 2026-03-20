import { NextResponse } from "next/server";

import { atualizarPesquisa, excluirPesquisa, obterPesquisa, obterPesquisaPublica } from "@/service/pesquisa-opiniao.service";
import type { AtualizarPesquisaOpiniaoPayload } from "@/types/pesquisa-opiniao";
import { requirePesquisaAdminSession, requirePesquisaSession } from "@/app/api/pesquisa-de-opniao/_utils";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  const auth = await requirePesquisaSession();

  if (auth.token) {
    const privateResult = await obterPesquisa(auth.token, id);
    if (privateResult.ok) {
      return NextResponse.json(privateResult.data, { status: 200 });
    }
  }

  const publicResult = await obterPesquisaPublica(id);
  if (!publicResult.ok) {
    return NextResponse.json({ message: publicResult.message }, { status: publicResult.status || 502 });
  }

  return NextResponse.json(publicResult.data, { status: 200 });
}

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { token, response } = await requirePesquisaAdminSession();

  if (response || !token) {
    return response as NextResponse;
  }

  const body = (await request.json().catch(() => null)) as AtualizarPesquisaOpiniaoPayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Payload invalido para atualizar pesquisa." }, { status: 400 });
  }

  const result = await atualizarPesquisa(token, id, body);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json(result.data, { status: result.status || 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { token, response } = await requirePesquisaAdminSession();

  if (response || !token) {
    return response as NextResponse;
  }

  const result = await excluirPesquisa(token, id);
  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status || 502 });
  }

  return NextResponse.json({ message: result.message }, { status: 200 });
}
