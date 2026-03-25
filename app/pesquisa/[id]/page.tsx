import { IntencaoVotoPublicoClient } from "@/app/intencao-voto/[pesquisaId]/publico-client";

export default async function PesquisaPublicaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <IntencaoVotoPublicoClient pesquisaId={id} />;
}
