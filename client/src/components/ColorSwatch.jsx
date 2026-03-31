import React from 'react';

/**
 * A small color swatch circle.
 * @param {string} hex  - CSS color value
 * @param {string} size - Tailwind size class e.g. "w-6 h-6"
 * @param {string} className - extra classes
 */
export default function ColorSwatch({ hex, size = 'w-7 h-7', className = '' }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-white shadow-md flex-shrink-0 ${size} ${className}`}
      style={{ backgroundColor: hex || '#ccc' }}
      title={hex}
    />
  );
}
