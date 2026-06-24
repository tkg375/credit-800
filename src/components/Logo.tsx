export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src="/Transparent.png"
      alt="Credit800.com"
      className={`shrink-0 w-auto object-contain ${className}`}
    />
  );
}
