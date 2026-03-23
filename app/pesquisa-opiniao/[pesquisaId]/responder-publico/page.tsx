import { ResponderPesquisaPublicoClient } from "./responder-publico-client";

export default async function ResponderPesquisaPublicoPage({
  params,
}: {
  params: Promise<{ pesquisaId: string }>;
}) {
  const { pesquisaId } = await params;
  return <ResponderPesquisaPublicoClient pesquisaId={pesquisaId} />;
}

