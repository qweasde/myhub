"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon } from "lucide-react";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

type Sortable = ReturnType<typeof useSortable>;
type HandleProps = { attributes: Sortable["attributes"]; listeners: Sortable["listeners"] };
const HandleContext = createContext<HandleProps | null>(null);

type Props<T extends { id: number }> = {
  items: T[];
  onReorder: (ids: number[]) => void;
  renderItem: (item: T) => React.ReactNode;
  layout?: "list" | "grid";
  className?: string;
};

/** Drag & drop list (mouse, touch and keyboard). Items render a <DragHandle /> to start dragging. */
export function SortableList<T extends { id: number }>({
  items,
  onReorder,
  renderItem,
  layout = "list",
  className,
}: Props<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = items.map((item) => item.id);
    onReorder(arrayMove(ids, ids.indexOf(Number(active.id)), ids.indexOf(Number(over.id))));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={layout === "list" ? [restrictToVerticalAxis, restrictToParentElement] : [restrictToParentElement]}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={layout === "list" ? verticalListSortingStrategy : rectSortingStrategy}
      >
        <div className={cn(layout === "list" ? "flex flex-col gap-2" : "flex flex-wrap gap-2", className)}>
          {items.map((item) => (
            <SortableItem key={item.id} id={item.id}>
              {renderItem(item)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-10 opacity-80 shadow-lg")}
    >
      <HandleContext value={{ attributes, listeners }}>{children}</HandleContext>
    </div>
  );
}

export function DragHandle({ className }: { className?: string }) {
  const handle = useContext(HandleContext);
  return (
    <button
      type="button"
      aria-label="Перетащить"
      className={cn("cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing", className)}
      {...handle?.attributes}
      {...handle?.listeners}
    >
      <GripVerticalIcon className="size-4" />
    </button>
  );
}
