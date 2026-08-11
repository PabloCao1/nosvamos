export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safeValue = Math.min(100, Math.max(0, value));
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${safeValue}%` }} />
    </div>
  );
}
