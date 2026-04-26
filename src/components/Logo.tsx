export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/logo.png"
      alt="Credit 800"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
