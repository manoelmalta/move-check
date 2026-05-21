import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { getMostRecentOpenSessionByType, getSessionById } from "@/actions/session";
import { getRegistrationLogs } from "@/actions/registration";
import { RegistrationCockpit } from "@/app/coletar/registration-cockpit";
import { NoSession } from "@/app/coletar/no-session";
import { ClosedSession } from "@/app/coletar/closed-session";

export default async function CadastroProdutoCompanyPage({
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
    : await getMostRecentOpenSessionByType(companyId, "PRODUCT_REGISTRATION");

  if (!session) {
    return <NoSession operationType="PRODUCT_REGISTRATION" companyId={companyId} />;
  }

  if (session.status === "closed") {
    return <ClosedSession session={session} />;
  }

  const initialLogs = await getRegistrationLogs(session.id);
  return <RegistrationCockpit session={session} initialLogs={initialLogs} companyId={companyId} />;
}
