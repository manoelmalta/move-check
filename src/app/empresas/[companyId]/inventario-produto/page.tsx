import { redirect } from "next/navigation";

export default async function InventarioProdutoLegacyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { companyId } = await params;
  const { sessionId } = await searchParams;

  if (sessionId) {
    redirect(`/empresas/${companyId}/inventarios/${sessionId}/produto`);
  }
  redirect(`/empresas/${companyId}/inventarios`);
}
