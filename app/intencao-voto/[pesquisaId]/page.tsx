import { IntencaoVotoPublicoClient } from "@/app/intencao-voto/[pesquisaId]/publico-client";

export default async function PesquisaIntencaoVotoPublicaPage({
  params,
}: {
  params: Promise<{ pesquisaId: string }>;
}) {
  const { pesquisaId } = await params;
  return <IntencaoVotoPublicoClient pesquisaId={pesquisaId} />;
}
