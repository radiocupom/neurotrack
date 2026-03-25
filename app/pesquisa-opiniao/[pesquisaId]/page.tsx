import { ResponderPesquisaPublicoClient } from "@/app/pesquisa-opiniao/[pesquisaId]/responder-publico/responder-publico-client";

export default async function PesquisaOpiniaoPublicaPage({
  params,
}: {
  params: Promise<{ pesquisaId: string }>;
}) {
  const { pesquisaId } = await params;
  return <ResponderPesquisaPublicoClient pesquisaId={pesquisaId} />;
}
