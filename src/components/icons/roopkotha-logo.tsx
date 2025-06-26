import Image from 'next/image';
import { cn } from '@/lib/utils';

type RoopkothaLogoProps = {
  className?: string;
  showTagline?: boolean;
  width?: number;
  height?: number;
};

const RoopkothaLogo = ({ className, showTagline = true, width = 200, height = 48 }: RoopkothaLogoProps) => (
  <div className={cn("flex flex-col items-center justify-center", className)}>
    <Image
      src="/logo.png"
      alt="Roopkotha Logo"
      width={width}
      height={height}
      priority // Eager load the logo as it's likely LCP
    />
    {showTagline && (
      <p className="text-xs italic text-muted-foreground mt-1">
        Where fashion meets fairytale
      </p>
    )}
  </div>
);

export default RoopkothaLogo;
