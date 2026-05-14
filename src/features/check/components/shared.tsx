export function CardSkeleton() {
  return (
    <div>
      <div className="skeleton-line medium" />
      <div className="skeleton-line full" />
      <div className="skeleton-line short" />
    </div>
  );
}

export function confidenceClass(confidence: string): string {
  return `badge badge-confidence-${confidence}`;
}
