import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  backHref?: string;
};

export function PageHeader({ title, subtitle, backHref = "/" }: Props) {
  return (
    <header className="bg-[#0057B8] text-white px-4 pt-4 pb-4">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <Link href={backHref} className="text-white/70 active:text-white transition-colors shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>
        <div>
          {subtitle && (
            <div className="text-[10px] text-white/50 tracking-[0.25em] uppercase">{subtitle}</div>
          )}
          <div className="font-bold text-base leading-tight">{title}</div>
        </div>
      </div>
    </header>
  );
}
