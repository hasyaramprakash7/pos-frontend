import React, { useRef, useState, useCallback } from 'react';

const DOT_POSITIONS = [
  { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
  { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
];

export default function PatternLock({ onPatternComplete, size = 280 }) {
  const [selected, setSelected] = useState([]);
  const [drawLine, setDrawLine] = useState(false);
  const containerRef = useRef(null);
  const dotRadius = 20;
  const padding = 40;
  const gridSize = size - padding * 2;
  const cellSize = gridSize / 2;

  const getDotCenter = (dot) => ({
    x: padding + dot.x * cellSize,
    y: padding + dot.y * cellSize,
  });

  const isDotSelected = (index) => selected.includes(index);

  const handleStart = useCallback((e) => {
    e.preventDefault();
    setDrawLine(true);
    setSelected([]);
  }, []);

  const handleMove = useCallback((e) => {
    if (!drawLine) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

    const newSelected = [...selected];
    DOT_POSITIONS.forEach((dot, i) => {
      const center = getDotCenter(dot);
      const dist = Math.hypot(x - center.x, y - center.y);
      if (dist < dotRadius && !newSelected.includes(i)) {
        newSelected.push(i);
      }
    });
    setSelected(newSelected);
  }, [drawLine, selected]);

  const handleEnd = useCallback(() => {
    if (drawLine) {
      setDrawLine(false);
      if (selected.length >= 4) {
        onPatternComplete(selected.join('')); // e.g. "0148"
      } else {
        onPatternComplete(null); // too short
      }
      setSelected([]);
    }
  }, [drawLine, selected, onPatternComplete]);

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, position: 'relative', touchAction: 'none', margin: '0 auto' }}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      {/* Connecting lines */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {selected.length > 1 && selected.map((dotIndex, i) => {
          if (i === 0) return null;
          const prev = getDotCenter(DOT_POSITIONS[selected[i - 1]]);
          const curr = getDotCenter(DOT_POSITIONS[dotIndex]);
          return (
            <line
              key={i}
              x1={prev.x} y1={prev.y} x2={curr.x} y2={curr.y}
              stroke="#2ecc71" strokeWidth="4" strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Dots */}
      {DOT_POSITIONS.map((dot, i) => {
        const center = getDotCenter(dot);
        const active = isDotSelected(i);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: center.x - dotRadius,
              top: center.y - dotRadius,
              width: dotRadius * 2,
              height: dotRadius * 2,
              borderRadius: '50%',
              border: active ? '2px solid #2ecc71' : '2px solid #444',
              backgroundColor: active ? '#2ecc71' : '#1a1a1a',
              boxShadow: active ? '0 0 10px #2ecc71' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}