import { useState, useCallback } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const useConfirmDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        description: '',
        onConfirm: () => {},
        confirmText: 'Confirm',
        variant: 'default'
    });

    const confirm = useCallback((newConfig) => {
        return new Promise((resolve) => {
            setConfig({
                ...newConfig,
                onConfirm: async () => {
                    try {
                        await newConfig.onConfirm?.();
                        setIsOpen(false);
                        resolve(true);
                    } catch (error) {
                        setIsOpen(false);
                        resolve(false);
                        throw error;
                    }
                }
            });
            setIsOpen(true);
        });
    }, []);

    const cancel = useCallback(() => {
        setIsOpen(false);
    }, []);

    return {
        isOpen,
        config,
        confirm,
        cancel
    };
};

export const ConfirmDialog = ({ isOpen, config, onCancel }) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={onCancel}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{config.title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {config.description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={config.onConfirm}
                        className={config.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                        {config.confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};