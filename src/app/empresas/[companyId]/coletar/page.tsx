import { redirect } from "next/navigation";
import { getSessionById } from "@/actions/session";

export default async function ColetarLegacyHub({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { companyId } = await params;
  const { sessionId } = await searchParams;

  // Backward-compat: deep links with sessionId resolvem para a tela correta
  if (sessionId) {
    const session = await getSessionById(companyId, sessionId);
    if (session) {
      const route =
        session.operationType === "PRODUCT_REGISTRATION"
          ? "cadastro-produto"
          : "inventario-produto";
      redirect(`/empresas/${companyId}/${route}?sessionId=${sessionId}`);
    }
  }

  redirect(`/empresas/${companyId}/inventarios`);
}
