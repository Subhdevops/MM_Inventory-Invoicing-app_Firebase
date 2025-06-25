
import * as React from "react"

// A simpler, elegant SVG-based logo with a tagline.
type RoopkothaLogoProps = React.SVGProps<SVGSVGElement> & {
  showTagline?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
};

const RoopkothaLogo = ({ showTagline = true, primaryColor, secondaryColor, ...props }: RoopkothaLogoProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 250 60"
    width="200"
    height="48"
    {...props}
  >
    <text
      x="50%"
      y="30"
      fontFamily="Georgia, serif"
      fontSize="30"
      fontWeight="bold"
      fill={primaryColor || "hsl(var(--primary))"}
      letterSpacing="1"
      textAnchor="middle"
    >
      ROOPKOTHA
    </text>
    {showTagline && (
      <text
        x="50%"
        y="50"
        fontFamily="Georgia, serif"
        fontSize="12"
        fontStyle="italic"
        fill={secondaryColor || "hsl(var(--muted-foreground))"}
        textAnchor="middle"
      >
        Where fashion meets fairytale
      </text>
    )}
  </svg>
)

export default RoopkothaLogo;
