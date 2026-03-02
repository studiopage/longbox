import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 md:py-20 text-center px-4">
      {Icon && (
        <div className="mb-4 text-muted-foreground/50">
          <Icon className="w-12 h-12 md:w-16 md:h-16" />
        </div>
      )}
      <h3 className="text-lg md:text-xl font-semibold text-muted-foreground mb-2">{title}</h3>
      {description && (
        <p className="text-sm md:text-base text-muted-foreground/70 max-w-md mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
