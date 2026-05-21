import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function MoveCheckLogo({ size = 40, className = "", priority = false }: Props) {
  return (
    <Image
      src="/branding/logo-check.png"
      alt="MOVE CHECK"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
