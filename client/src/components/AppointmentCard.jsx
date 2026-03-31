import React from 'react';
import ColorSwatch from './ColorSwatch.jsx';
import { api } from '../lib/api.js';

const STATUS_LABELS = {
  pending: 'ממתינה',
  arrived: 'הגיעה',
  done: 'הסתיים',
};

const STATUS_CLASSES = {
  pending: 'status-pending',
  arrived: 'status-arrived',
  done: 'status-done',
};

const NEXT_STATUS = {
  pending: 'arrived',
  arrived: 'done',
  done: null,
};

const NEXT_STATUS_LABEL = {
  pending: 'סמן הגיעה',
  arrived: 'סמן הסתיים',
};

export default function AppointmentCard({ appointment, onStatusChange }) {
  const { id, time, status, clients, colors } = appointment;
  const clientName = clients?.name || 'לקוחה לא ידועה';
  const colorName = colors?.name || '';
  const colorHex = colors?.hex || '#ccc';

  const nextStatus = NEXT_STATUS[status];

  const handleAdvance = async () => {
    if (!nextStatus) return;
    try {
      const updated = await api.patch(`/api/appointments/${id}`, { status: nextStatus });
      onStatusChange?.(updated);
    } catch (err) {
      console.error('Status update error:', err);
    }
  };

  return (
    <div className="card fade-in flex items-center gap-3">
      {/* Time */}
      <div className="text-center min-w-[48px]">
        <span className="text-purple-dark font-bold text-lg leading-none">{time?.slice(0, 5)}</span>
      </div>

      {/* Color swatch */}
      <ColorSwatch hex={colorHex} size="w-9 h-9" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate">{clientName}</p>
        {colorName && (
          <p className="text-xs text-gray-500 truncate">{colorName}</p>
        )}
      </div>

      {/* Status + action */}
      <div className="flex flex-col items-end gap-1">
        <span className={STATUS_CLASSES[status]}>{STATUS_LABELS[status]}</span>
        {nextStatus && (
          <button
            onClick={handleAdvance}
            className="text-xs text-purple-dark underline font-semibold"
          >
            {NEXT_STATUS_LABEL[status]}
          </button>
        )}
      </div>
    </div>
  );
}
