
import Image from 'next/image';
import { cn } from '@/lib/utils';

type MinimalMischiefLogoProps = {
  className?: string;
  showTagline?: boolean;
  width?: number;
  height?: number;
};

const MinimalMischiefLogo = ({ className, showTagline = true, width = 200, height = 48 }: MinimalMischiefLogoProps) => (
  <div className={cn("flex flex-col items-center justify-center", className)}>
    <Image
      src="/logo.png"
      alt="Minimal Mischief Logo"
      width={width}
      height={height}
      priority // Eager load the logo as it's likely LCP
    />
    {showTagline && (
      <p className="text-xs italic text-muted-foreground mt-1">
        Simple by Nature, Mischief by Choice
      </p>
    )}
  </div>
);

export default MinimalMischiefLogo;
