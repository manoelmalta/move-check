import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { getMostRecentOpenSessionByType, getSessionById } from "@/actions/session";
import { getSessionEntries } from "@/actions/scan";
import { ScannerCockpit } from "@/app/coletar/scanner-cockpit";
import { NoSession } from "@/app/coletar/no-session";
import { ClosedSession } from "@/app/coletar/closed-session";

export default async function InventarioProdutoCompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { companyId } = await params;
  const { sessionId } = await searchParams;

  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const session = sessionId
    ? await getSessionById(sessionId)
    : await getMostRecentOpenSessionByType(companyId, "PRODUCT_INVENTORY");

  if (!session) {
    return <NoSession operationType="PRODUCT_INVENTORY" companyId={companyId} />;
  }

  if (session.status === "closed") {
    return <ClosedSession session={session} />;
  }

  const recentEntries = await getSessionEntries(session.id);

  return (
    <ScannerCockpit
      session={session}
      companyId={companyId}
      initialEntries={recentEntries.map((e) => ({
        id: e.id,
        code: e.code,
        codeType: e.codeType,
        quantity: e.quantity,
        status: e.status,
        scannedAt: e.scannedAt,
        product: e.product
          ? { codigoInterno: e.product.codigoInterno, descricao: e.product.descricao }
          : null,
      }))}
    />
  );
}
