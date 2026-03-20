import { NextResponse } from "next/server";

import { carregarQuestionarioBigFive } from "@/service/bigfive.service";

export async function GET() {
  const result = await carregarQuestionarioBigFive();

  if (!result.ok || !result.data) {
    return NextResponse.json(
      { message: result.message || "Falha ao carregar questionario Big Five." },
      { status: result.status || 502 },
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}