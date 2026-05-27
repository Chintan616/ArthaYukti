const Skeleton = ({ className = '' }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{ backgroundColor: 'var(--surface-elevated)' }}
  />
);

export const SkeletonCard = () => (
  <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
    <div className="flex justify-between items-start">
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
    <Skeleton className="h-4 w-20" />
  </div>
);

export const SkeletonRow = () => (
  <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-md" />
      <div className="space-y-1">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="text-right space-y-1">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-3 w-12" />
    </div>
  </div>
);

export default Skeleton;
