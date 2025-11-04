import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Eye, EyeOff, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';
import { User } from '@/api/entities';

export default function WidgetManager({ 
    pageName, 
    defaultWidgets, 
    renderWidgetContent, 
    user,
    navigate,
    createPageUrl 
}) {
    const [widgets, setWidgets] = useState(defaultWidgets);
    const [hiddenWidgets, setHiddenWidgets] = useState([]);
    const [isCustomizing, setIsCustomizing] = useState(false);

    useEffect(() => {
        if (user?.page_layouts?.[pageName]) {
            const layout = user.page_layouts[pageName];
            
            // Reorder widgets based on saved order
            if (layout.widget_order) {
                const orderedWidgets = [];
                layout.widget_order.forEach(id => {
                    const widget = defaultWidgets.find(w => w.id === id);
                    if (widget) orderedWidgets.push(widget);
                });
                // Add any new widgets not in saved order
                defaultWidgets.forEach(w => {
                    if (!layout.widget_order.includes(w.id)) {
                        orderedWidgets.push(w);
                    }
                });
                setWidgets(orderedWidgets);
            }

            // Set hidden widgets
            if (layout.hidden_widgets) {
                setHiddenWidgets(layout.hidden_widgets);
            }
        } else {
            setWidgets(defaultWidgets);
        }
    }, [user, pageName, defaultWidgets]);

    const handleDragEnd = async (result) => {
        if (!result.destination) return;

        const items = Array.from(widgets);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setWidgets(items);

        try {
            const newLayout = {
                ...(user?.page_layouts || {}),
                [pageName]: {
                    widget_order: items.map(w => w.id),
                    hidden_widgets: hiddenWidgets
                }
            };

            await User.updateMyUserData({ page_layouts: newLayout });
            toast.success("Widget order saved");
        } catch (error) {
            console.error('Error saving layout:', error);
            toast.error("Failed to save layout");
        }
    };

    const toggleWidgetVisibility = async (widgetId) => {
        const newHidden = hiddenWidgets.includes(widgetId)
            ? hiddenWidgets.filter(id => id !== widgetId)
            : [...hiddenWidgets, widgetId];

        setHiddenWidgets(newHidden);

        try {
            const newLayout = {
                ...(user?.page_layouts || {}),
                [pageName]: {
                    widget_order: widgets.map(w => w.id),
                    hidden_widgets: newHidden
                }
            };

            await User.updateMyUserData({ page_layouts: newLayout });
            toast.success("Widget visibility updated");
        } catch (error) {
            console.error('Error updating visibility:', error);
            toast.error("Failed to update visibility");
        }
    };

    const groupedWidgets = {
        top: widgets.filter(w => w.layout === 'top' && !hiddenWidgets.includes(w.id)),
        'main-col': widgets.filter(w => w.layout === 'main-col' && !hiddenWidgets.includes(w.id)),
        'side-col': widgets.filter(w => w.layout === 'side-col' && !hiddenWidgets.includes(w.id))
    };

    const renderWidget = (widget, index, isDragging = false) => {
        const content = renderWidgetContent(widget.id);
        
        // If content is null or undefined, skip rendering
        if (!content) {
            return null;
        }

        const showControls = widget.showControls !== false && isCustomizing;

        return (
            <div key={widget.id} className={isDragging ? 'opacity-50' : ''}>
                <Card className="relative">
                    {showControls && (
                        <div className="absolute top-2 right-2 z-10 flex gap-2">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => toggleWidgetVisibility(widget.id)}
                                className="h-8 w-8"
                            >
                                <EyeOff className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                    {content}
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Customization Toggle */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCustomizing(!isCustomizing)}
                >
                    <SettingsIcon className="w-4 h-4 mr-2" />
                    {isCustomizing ? 'Done Customizing' : 'Customize Dashboard'}
                </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
                {/* Top Widgets */}
                {groupedWidgets.top.length > 0 && (
                    <Droppable droppableId="top-widgets" isDropDisabled={!isCustomizing}>
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="space-y-6"
                            >
                                {groupedWidgets.top.map((widget, index) => (
                                    <Draggable
                                        key={widget.id}
                                        draggableId={widget.id}
                                        index={index}
                                        isDragDisabled={!isCustomizing}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                            >
                                                {isCustomizing && (
                                                    <div
                                                        {...provided.dragHandleProps}
                                                        className="flex items-center justify-center mb-2 cursor-move"
                                                    >
                                                        <GripVertical className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                )}
                                                {renderWidget(widget, index, snapshot.isDragging)}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                )}

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Column */}
                    {groupedWidgets['main-col'].length > 0 && (
                        <Droppable droppableId="main-col-widgets" isDropDisabled={!isCustomizing}>
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="lg:col-span-2 space-y-6"
                                >
                                    {groupedWidgets['main-col'].map((widget, index) => (
                                        <Draggable
                                            key={widget.id}
                                            draggableId={widget.id}
                                            index={index}
                                            isDragDisabled={!isCustomizing}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                >
                                                    {isCustomizing && (
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="flex items-center justify-center mb-2 cursor-move"
                                                        >
                                                            <GripVertical className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    {renderWidget(widget, index, snapshot.isDragging)}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    )}

                    {/* Side Column */}
                    {groupedWidgets['side-col'].length > 0 && (
                        <Droppable droppableId="side-col-widgets" isDropDisabled={!isCustomizing}>
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="space-y-6"
                                >
                                    {groupedWidgets['side-col'].map((widget, index) => (
                                        <Draggable
                                            key={widget.id}
                                            draggableId={widget.id}
                                            index={index}
                                            isDragDisabled={!isCustomizing}
                                        >
                                            {(provided, snapshot) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                >
                                                    {isCustomizing && (
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="flex items-center justify-center mb-2 cursor-move"
                                                        >
                                                            <GripVertical className="w-5 h-5 text-slate-400" />
                                                        </div>
                                                    )}
                                                    {renderWidget(widget, index, snapshot.isDragging)}
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    )}
                </div>
            </DragDropContext>

            {/* Hidden Widgets Panel */}
            {isCustomizing && hiddenWidgets.length > 0 && (
                <Card className="bg-slate-50">
                    <CardHeader>
                        <CardTitle className="text-sm">Hidden Widgets</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {widgets
                                .filter(w => hiddenWidgets.includes(w.id))
                                .map(widget => (
                                    <div
                                        key={widget.id}
                                        className="flex items-center justify-between p-2 bg-white rounded border"
                                    >
                                        <span className="text-sm">{widget.title || widget.id}</span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => toggleWidgetVisibility(widget.id)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}