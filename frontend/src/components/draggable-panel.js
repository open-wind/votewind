'use client';

import React, { useState } from 'react';
import { DndContext, useDraggable } from '@dnd-kit/core';
import clsx from 'clsx'; // Optional: for class merging, install with `npm i clsx`

export default function DraggablePanel({ children, className = '' }) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [panelSize, setPanelSize] = useState({ width: 300, height: 200 });

  const Draggable = () => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
    } = useDraggable({ id: 'draggable-panel' });

    const liveX = position.x + (transform?.x ?? 0);
    const liveY = position.y + (transform?.y ?? 0);

    const style = {
      transform: `translate3d(${liveX}px, ${liveY}px, 0)`,
      touchAction: 'none',
      cursor: 'grab',
    };

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={clsx(
          'fixed z-50 max-w-md w-full',
          className
        )}
      >
        {children}
      </div>
    );
  };

  const handleDragEnd = ({ delta }) => {
    const nextX = position.x + delta.x;
    const nextY = position.y + delta.y;

    const maxX = window.innerWidth - panelSize.width;
    const maxY = window.innerHeight - panelSize.height;

    setPosition({
      x: Math.min(Math.max(0, nextX), maxX),
      y: Math.min(Math.max(0, nextY), maxY),
    });
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <Draggable />
    </DndContext>
  );
}
