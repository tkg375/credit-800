export function Logo({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden shrink-0 ${className}`}
      style={{ aspectRatio: "4 / 1" }}
    >
      <img
        src="/logo.png"
        alt="Credit 800"
        style={{
          position: "absolute",
          height: "300%",
          width: "auto",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -60%)",
        }}
      />
    </div>
  );
}
