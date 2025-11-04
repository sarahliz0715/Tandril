import { useMemo, useState, useCallback } from 'react';

/**
 * Hook for optimized list filtering and searching
 * Prevents unnecessary re-renders and calculations
 */
export const useOptimizedList = (items, initialFilters = {}) => {
    const [filters, setFilters] = useState(initialFilters);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredItems = useMemo(() => {
        let result = items;

        // Apply search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            result = result.filter(item => 
                Object.values(item).some(value => 
                    String(value).toLowerCase().includes(search)
                )
            );
        }

        // Apply filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                result = result.filter(item => item[key] === value);
            }
        });

        return result;
    }, [items, searchTerm, filters]);

    const updateFilter = useCallback((key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(initialFilters);
        setSearchTerm('');
    }, [initialFilters]);

    return {
        filteredItems,
        searchTerm,
        setSearchTerm,
        filters,
        updateFilter,
        clearFilters,
        hasActiveFilters: searchTerm || Object.values(filters).some(v => v && v !== 'all')
    };
};