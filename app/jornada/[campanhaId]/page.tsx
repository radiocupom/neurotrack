import { JornadaPublicaClient } from "@/app/jornada/[campanhaId]/jornada-publica-client";

export default async function JornadaPublicaPage({
  params,
}: {
  params: Promise<{ campanhaId: string }>;
}) {
  const { campanhaId } = await params;
  return <JornadaPublicaClient campanhaId={campanhaId} />;
}
