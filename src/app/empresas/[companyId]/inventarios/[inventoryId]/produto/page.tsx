import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { getSessionById } from "@/actions/session";
import { getSessionEntries } from "@/actions/scan";
import { ScannerCockpit } from "@/app/coletar/scanner-cockpit";
import { NoSession } from "@/app/coletar/no-session";
import { ClosedSession } from "@/app/coletar/closed-session";

export default async function InventarioProdutoPage({
  params,
}: {
  params: Promise<{ companyId: string; inventoryId: string }>;
}) {
  const { companyId, inventoryId } = await params;

  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const session = await getSessionById(companyId, inventoryId);

  if (!session) {
    return <NoSession operationType="PRODUCT_INVENTORY" companyId={companyId} />;
  }

  if (session.status === "closed") {
    return <ClosedSession session={session} companyId={companyId} />;
  }

  const recentEntries = await getSessionEntries(companyId, session.id);

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
