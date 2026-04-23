'use client';

interface EmptyStateProps {
  emoji?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ emoji = '🏠', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-6xl mb-4">{emoji}</div>
      <h3 className="mb-2 text-base font-semibold text-[#415449]">{title}</h3>
      {description && (
        <p className="mb-6 max-w-xs text-sm leading-relaxed text-[#8c7d63]">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-full bg-[#1f3a30] px-6 py-2.5 text-sm font-medium text-white transition-colors active:bg-[#173026]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
