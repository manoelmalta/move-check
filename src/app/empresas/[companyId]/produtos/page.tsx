export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getCompanyById } from "@/actions/company";
import { getProductsForCatalog } from "@/actions/product";
import { ProductCatalog } from "./product-catalog";

export default async function ProdutosPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  const company = await getCompanyById(companyId);
  if (!company) notFound();

  const products = await getProductsForCatalog(companyId);

  return (
    <ProductCatalog
      companyId={companyId}
      companyName={company.name}
      initialProducts={products}
    />
  );
}
