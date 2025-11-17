import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Inbox, Search, Plus, X } from 'lucide-react';

export const EmptyState = ({ 
    icon: Icon, 
    title, 
    description, 
    action,
    actionLabel,
    actionIcon: ActionIcon,
    variant = 'default',
    className = ''
}) => {
    const variants = {
        default: 'bg-slate-50 border-slate-200',
        success: 'bg-green-50 border-green-200',
        info: 'bg-blue-50 border-blue-200',
        warning: 'bg-yellow-50 border-yellow-200'
    };

    return (
        <div className={cn(
            'text-center py-12 rounded-lg border-2 border-dashed',
            variants[variant],
            className
        )}>
            {Icon && (
                <Icon className="mx-auto h-12 w-12 text-slate-400 mb-4" />
            )}
            <h3 className="text-lg font-medium text-slate-900 mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-slate-500 mb-4 max-w-md mx-auto">
                    {description}
                </p>
            )}
            {action && actionLabel && (
                <Button onClick={action}>
                    {ActionIcon && <ActionIcon className="w-4 h-4 mr-2" />}
                    {actionLabel}
                </Button>
            )}
        </div>
    );
};

export const NoDataEmptyState = ({ entityName, onCreate }) => (
    <EmptyState
        icon={Inbox}
        title={`No ${entityName} Yet`}
        description={`Get started by creating your first ${entityName.toLowerCase()}.`}
        action={onCreate}
        actionLabel={`Create ${entityName}`}
        actionIcon={Plus}
    />
);

export const NoResultsEmptyState = ({ onClear }) => (
    <EmptyState
        icon={Search}
        title="No Results Found"
        description="Try adjusting your filters or search terms."
        action={onClear}
        actionLabel="Clear Filters"
        actionIcon={X}
    />
);