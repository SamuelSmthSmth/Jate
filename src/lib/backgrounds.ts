export type BackgroundOption = {
  id: string;
  title: string;
};

/** Available background styles (id matches the BackgroundStyle setting). */
export const BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "solid", title: "Solid Color" },
  { id: "grid", title: "Dotted Grid" },
  { id: "animated", title: "Static Orbs" },
  { id: "diagonal", title: "Diagonal Stripes" },
  { id: "plus", title: "Plus Grid" },
  { id: "mesh", title: "Mesh Pattern" },
  { id: "waves", title: "Waves Pattern" },
  { id: "zigzag", title: "Zigzag Pattern" },
  { id: "boxes", title: "Boxes" },
  { id: "weave", title: "Woven Pattern" },
  { id: "lines", title: "Horizontal Lines" },
  { id: "paper", title: "Lined Paper" },
  { id: "blueprint", title: "Blueprint" },
  { id: "isometric", title: "Isometric Grid" },
  { id: "glow", title: "Neon Glow" },
  { id: "aurora", title: "Aurora" },
];

/** Returns the Tailwind utility classes for a background style. */
export function getBgClass(style: string): string {
  if (style === 'grid') return "bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]";
  if (style === 'diagonal') return "bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.05)_10px,rgba(0,0,0,0.05)_20px)] dark:bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)]";
  if (style === 'plus') return "bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]";
  if (style === 'mesh') return "bg-[radial-gradient(ellipse_at_center,transparent_0%,#80808011_100%)] bg-[size:10px_10px]";
  if (style === 'waves') return "bg-[repeating-radial-gradient(circle_at_0_0,transparent_0,#80808011_10px,transparent_20px)]";
  if (style === 'zigzag') return "bg-[linear-gradient(135deg,#80808011_25%,transparent_25%),linear-gradient(225deg,#80808011_25%,transparent_25%),linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(315deg,#80808011_25%,transparent_25%)] bg-[size:20px_20px] bg-[position:10px_0,10px_0,0_0,0_0]";

  if (style === 'boxes') return "bg-[linear-gradient(#80808011_1px,transparent_1px),linear-gradient(90deg,#80808011_1px,transparent_1px)] bg-[size:30px_30px]";
  if (style === 'weave') return "bg-[linear-gradient(45deg,#80808011_25%,transparent_25%),linear-gradient(-45deg,#80808011_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#80808011_75%),linear-gradient(-45deg,transparent_75%,#80808011_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]";
  if (style === 'lines') return "bg-[repeating-linear-gradient(0deg,transparent,transparent_9px,#80808011_10px)]";
  if (style === 'paper') return "bg-[linear-gradient(transparent_95%,#80808011_100%)] bg-[size:100%_2rem]";
  if (style === 'blueprint') return "bg-[#0f172a] bg-[linear-gradient(#1e293b_1px,transparent_1px),linear-gradient(90deg,#1e293b_1px,transparent_1px)] bg-[size:20px_20px]";
  if (style === 'isometric') return "bg-[linear-gradient(30deg,#80808011_1px,transparent_1px),linear-gradient(150deg,#80808011_1px,transparent_1px)] bg-[size:20px_34.64px]";
  if (style === 'glow') return "bg-[radial-gradient(circle_at_50%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_50%_100%,rgba(120,119,198,0.15),transparent_50%)]";
  if (style === 'aurora') return "bg-[radial-gradient(circle_at_0%_0%,rgba(120,119,198,0.15),transparent_50%),radial-gradient(circle_at_100%_100%,rgba(255,100,200,0.15),transparent_50%),radial-gradient(circle_at_100%_0%,rgba(100,255,200,0.15),transparent_50%)]";

  return "";
}
