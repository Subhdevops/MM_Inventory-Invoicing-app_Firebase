
import { cn } from "@/lib/utils";

const OwlIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-24 h-24", className)}
    >
      <g className="owl-head-turn">
        {/* Body */}
        <path d="M 50,30 C 25,30 20,70 20,90 H 80 C 80,70 75,30 50,30 Z" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth="2" />
        
        {/* Wings */}
        <path d="M 20,60 C 10,70 10,85 20,90" fill="hsl(var(--primary) / 0.4)" stroke="hsl(var(--primary))" strokeWidth="2"/>
        <path d="M 80,60 C 90,70 90,85 80,90" fill="hsl(var(--primary) / 0.4)" stroke="hsl(var(--primary))" strokeWidth="2"/>

        {/* Head */}
        <path d="M 50,10 C 20,10 20,50 50,50 C 80,50 80,10 50,10 Z" fill="hsl(var(--primary) / 0.6)" stroke="hsl(var(--primary))" strokeWidth="2"/>

        {/* Eyes */}
        <circle cx="38" cy="35" r="12" fill="white" stroke="hsl(var(--primary))" strokeWidth="1.5" />
        <circle cx="62" cy="35" r="12" fill="white" stroke="hsl(var(--primary))" strokeWidth="1.5" />

        {/* Pupils that blink */}
        <g className="owl-blink">
          <circle cx="38" cy="35" r="5" fill="hsl(var(--foreground))" />
          <circle cx="62" cy="35" r="5" fill="hsl(var(--foreground))" />
        </g>

        {/* Beak */}
        <path d="M 50,42 L 45,50 L 55,50 Z" fill="#FFA500" stroke="hsl(var(--foreground))" strokeWidth="1" />

        {/* Ear tufts */}
        <path d="M 30 15 Q 35 5 40 15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
        <path d="M 70 15 Q 65 5 60 15" fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  );
};

export default OwlIcon;
