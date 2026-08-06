type Props = {
  height?: number;
  className?: string;
};

export default function NomiLogo({ height = 32, className = "" }: Props) {
  return (
    <img
      src="/nomi-logo.png"
      alt="NOMI"
      style={{ height: `${height}px`, width: "auto", objectFit: "contain" }}
      className={className}
    />
  );
}
