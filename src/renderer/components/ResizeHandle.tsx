import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onDrag: (delta: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
}

export const ResizeHandle: React.FC<ResizeHandleProps> = ({
  direction,
  onDrag,
  onDragStart,
  onDragEnd,
  className = '',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const draggingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const onDragRef = useRef(onDrag);
  const onDragEndRef = useRef(onDragEnd);
  const directionRef = useRef(direction);
  onDragRef.current = onDrag;
  onDragEndRef.current = onDragEnd;
  directionRef.current = direction;

  // Stable mouse handlers that read from refs (no stale closures)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingRef.current || !lastPosRef.current) return;
    const delta = directionRef.current === 'horizontal'
      ? e.clientX - lastPosRef.current.x
      : e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    onDragRef.current(delta);
  }, []);

  const handleMouseUp = useCallback(() => {
    draggingRef.current = false;
    lastPosRef.current = null;
    setIsDragging(false);
    onDragEndRef.current?.();
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
  }, [handleMouseMove]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!draggingRef.current || !lastPosRef.current) return;
    const touch = e.touches[0];
    const delta = directionRef.current === 'horizontal'
      ? touch.clientX - lastPosRef.current.x
      : touch.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: touch.clientX, y: touch.clientY };
    onDragRef.current(delta);
  }, []);

  const handleTouchEnd = useCallback(() => {
    draggingRef.current = false;
    lastPosRef.current = null;
    setIsDragging(false);
    onDragEndRef.current?.();
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    document.body.style.userSelect = '';
  }, [handleTouchMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setIsDragging(true);
    onDragStart?.();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
  }, [onDragStart, handleMouseMove, handleMouseUp]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    draggingRef.current = true;
    lastPosRef.current = { x: touch.clientX, y: touch.clientY };
    setIsDragging(true);
    onDragStart?.();
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.body.style.userSelect = 'none';
  }, [onDragStart, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.body.style.userSelect = '';
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className={`resize-handle ${isHorizontal ? 'resize-handle-horizontal' : 'resize-handle-vertical'} ${isDragging ? 'resize-handle-active' : ''} ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        position: 'relative',
        zIndex: 100,
        cursor: isHorizontal ? 'col-resize' : 'row-resize',
        width: isHorizontal ? '16px' : '100%',
        height: isHorizontal ? '100%' : '16px',
        flex: '0 0 auto',
        background: isDragging
          ? 'rgba(189, 147, 249, 0.5)'
          : isHorizontal
            ? 'linear-gradient(to right, transparent 6px, rgba(255, 255, 255, 0.15) 6px, rgba(255, 255, 255, 0.15) 10px, transparent 10px)'
            : 'linear-gradient(to bottom, transparent 6px, rgba(255, 255, 255, 0.15) 6px, rgba(255, 255, 255, 0.15) 10px, transparent 10px)',
        transition: isDragging ? 'none' : 'background-color 0.15s ease',
        pointerEvents: 'auto',
      }}
    />
  );
};

export default ResizeHandle;
