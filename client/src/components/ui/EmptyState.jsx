const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {Icon && (
      <div
        className="h-14 w-14 rounded-xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'oklch(0.78 0.16 152 / 0.1)' }}
      >
        <Icon className="h-6 w-6 stroke-[1.5]" style={{ color: 'var(--primary)' }} />
      </div>
    )}
    <p className="font-sans font-medium text-sm mb-1" style={{ color: 'var(--foreground)' }}>{title}</p>
    {description && (
      <p className="text-xs max-w-xs" style={{ color: 'var(--muted-foreground)' }}>{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
