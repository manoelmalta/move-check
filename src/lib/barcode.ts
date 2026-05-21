export type CodeType = "EAN" | "DUN" | "UNKNOWN";

export function detectCodeType(code: string): CodeType {
  const clean = code.trim().replace(/\D/g, "");
  if (clean.length === 13) return "EAN";
  if (clean.length === 14) return "DUN";
  return "UNKNOWN";
}
