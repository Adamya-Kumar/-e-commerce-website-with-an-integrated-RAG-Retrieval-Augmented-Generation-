export default function TypingDots() {
  return (
    <div className="flex items-center gap-1.5" aria-label="Assistant is typing">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-muted-green/60"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </div>
  );
}
