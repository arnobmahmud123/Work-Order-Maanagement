"use client";

import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";

/**
 * Lightweight virtualized grid — renders only visible rows + a buffer.
 * No external dependencies. Works with any grid column count.
 *
 * Usage:
 *   <VirtualGrid items={photos} columns={2} rowHeight={180} buffer={3}>
 *     {(photo) => <PhotoCard photo={photo} />}
 *   </VirtualGrid>
 */
export function VirtualGrid<T extends { id: string }>({
  items,
  columns = 2,
  rowHeight,
  buffer = 4,
  gap = 6,
  className,
  emptyState,
  children,
}: {
  items: T[];
  /** Number of columns in the grid */
  columns?: number;
  /** Height of each row in px */
  rowHeight: number;
  /** Extra rows to render above/below the viewport */
  buffer?: number;
  /** Grid gap in px */
  gap?: number;
  className?: string;
  emptyState?: ReactNode;
  children: (item: T, index: number) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  const totalRows = Math.ceil(items.length / columns);
  const totalHeight = totalRows * (rowHeight + gap) - gap;

  // Measure container height on mount and resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setContainerHeight(entry.contentRect.height);
    });
    observer.observe(el);
    setContainerHeight(el.clientHeight);

    return () => observer.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (el) setScrollTop(el.scrollTop);
  }, []);

  // Calculate visible row range
  const startRow = Math.max(0, Math.floor(scrollTop / (rowHeight + gap)) - buffer);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + containerHeight) / (rowHeight + gap)) + buffer
  );

  // Collect visible items
  const visibleItems: { item: T; index: number; row: number; col: number }[] = [];
  for (let row = startRow; row < endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const idx = row * columns + col;
      if (idx < items.length) {
        visibleItems.push({ item: items[idx], index: idx, row, col });
      }
    }
  }

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      style={{ overflow: "auto", position: "relative" }}
    >
      {/* Spacer to maintain correct scrollbar height */}
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map(({ item, index, row, col }) => (
          <div
            key={item.id}
            style={{
              position: "absolute",
              top: row * (rowHeight + gap),
              left: `${(col / columns) * 100}%`,
              width: `${100 / columns}%`,
              height: rowHeight,
              paddingLeft: col > 0 ? gap / 2 : 0,
              paddingRight: col < columns - 1 ? gap / 2 : 0,
            }}
          >
            {children(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}
