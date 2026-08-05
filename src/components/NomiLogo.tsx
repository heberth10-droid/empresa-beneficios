type Props = {
  size?: "sm" | "md" | "lg";
};

export default function NomiLogo({ size = "md" }: Props) {
  const textSize = size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-2xl";
  const dotSize = size === "sm" ? "w-2 h-2" : size === "lg" ? "w-3.5 h-3.5" : "w-2.5 h-2.5";
  const smileSize = size === "sm" ? "text-[8px]" : size === "lg" ? "text-[13px]" : "text-[10px]";
  const circleSize = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-8 h-8" : "w-6 h-6";

  return (
    <div className="flex items-center gap-0.5">
      <span className={`${textSize} font-black text-white tracking-tight`}>n</span>
      <span className={`relative inline-flex items-center justify-center ${circleSize}`}>
        <span className={`${textSize} font-black text-white tracking-tight`}>o</span>
        <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 ${smileSize} font-black leading-none`}
          style={{ color: "var(--nomi-orange)" }}>
          ◡
        </span>
      </span>
      <span className={`${textSize} font-black text-white tracking-tight`}>mi</span>
      <span className={`${dotSize} rounded-full ml-0.5 mb-3`}
        style={{ backgroundColor: "var(--nomi-orange)" }} />
    </div>
  );
}
