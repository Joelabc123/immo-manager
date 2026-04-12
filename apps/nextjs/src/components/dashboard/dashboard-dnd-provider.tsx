"use client";

import { useState, useCallback, type ReactNode } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { restrictToParentElement } from "@dnd-kit/modifiers";
import type { WidgetInstance } from "@repo/shared/types";

interface DashboardDndProviderProps {
  widgets: WidgetInstance[];
  onReorder: (activeId: string, overId: string) => void;
  isEditing: boolean;
  children: ReactNode;
  renderDragOverlay?: (widget: WidgetInstance) => ReactNode;
}

export function DashboardDndProvider({
  widgets,
  onReorder,
  isEditing,
  children,
  renderDragOverlay,
}: DashboardDndProviderProps) {
  const [activeWidget, setActiveWidget] = useState<WidgetInstance | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const widget = widgets.find((w) => w.id === event.active.id);
      if (widget) {
        setActiveWidget(widget);
      }
    },
    [widgets],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveWidget(null);
      const { active, over } = event;
      if (over && active.id !== over.id) {
        onReorder(active.id as string, over.id as string);
      }
    },
    [onReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveWidget(null);
  }, []);

  if (!isEditing) {
    return <>{children}</>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      modifiers={[restrictToParentElement]}
    >
      <SortableContext
        items={widgets.map((w) => w.id)}
        strategy={rectSortingStrategy}
      >
        {children}
      </SortableContext>
      <DragOverlay>
        {activeWidget && renderDragOverlay ? (
          <div className="rounded-lg border-2 border-primary bg-card/90 p-4 shadow-2xl backdrop-blur-sm">
            {renderDragOverlay(activeWidget)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
