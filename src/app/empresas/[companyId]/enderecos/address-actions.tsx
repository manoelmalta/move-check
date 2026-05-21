"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleAddressActive } from "@/actions/address";

type Props = {
  companyId: string;
  addressId: string;
  isActive: boolean;
};

export function AddressActions({ companyId, addressId, isActive }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async () => {
    setLoading(true);
    await toggleAddressActive(companyId, addressId, !isActive);
    setLoading(false);
    router.refresh();
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        isActive
          ? "bg-gray-50 border border-gray-200 text-gray-500 active:bg-gray-100"
          : "bg-teal-50 border border-teal-200 text-teal-700 active:bg-teal-100"
      }`}
    >
      {loading ? "…" : isActive ? "Inativar" : "Ativar"}
    </button>
  );
}
