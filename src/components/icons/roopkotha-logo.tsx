import * as React from "react"

// A more elegant, SVG-based logo for the brand.
const RoopkothaLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 250 50"
    width="200"
    height="40"
    {...props}
  >
    <text
      x="5"
      y="35"
      fontFamily="Georgia, serif"
      fontSize="30"
      fontWeight="bold"
      fill="hsl(var(--primary))"
      letterSpacing="1"
    >
      ROOPKOTHA
    </text>
    <path
      d="M220,15 Q230,25 220,35"
      stroke="hsl(var(--accent))"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
)

export default RoopkothaLogo;
