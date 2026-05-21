"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolvePendingItem, dismissPendingItem } from "@/actions/pending";

type Props = {
  companyId: string;
  pendingId: string;
};

export function PendingActions({ companyId, pendingId }: Props) {
  const [loading, setLoading] = useState<null | "resolve" | "dismiss">(null);
  const router = useRouter();

  const handle = async (action: "resolve" | "dismiss") => {
    setLoading(action);
    if (action === "resolve") {
      await resolvePendingItem(companyId, pendingId);
    } else {
      await dismissPendingItem(companyId, pendingId);
    }
    setLoading(null);
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      <button
        onClick={() => handle("resolve")}
        disabled={loading !== null}
        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 active:bg-green-100 disabled:opacity-50"
      >
        {loading === "resolve" ? "…" : "Resolver"}
      </button>
      <button
        onClick={() => handle("dismiss")}
        disabled={loading !== null}
        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 active:bg-gray-100 disabled:opacity-50"
      >
        {loading === "dismiss" ? "…" : "Descartar"}
      </button>
    </div>
  );
}
