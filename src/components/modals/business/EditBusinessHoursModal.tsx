import React, { useState } from 'react';
import { BaseModal } from '../BaseModal';
import { Clock } from 'lucide-react';

interface BusinessHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

interface EditBusinessHoursModalProps {
  currentHours: BusinessHours;
  onSave: (hours: BusinessHours) => Promise<void>;
  onClose: () => void;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export function EditBusinessHoursModal({
  currentHours,
  onSave,
  onClose,
}: EditBusinessHoursModalProps) {
  const [hours, setHours] = useState<BusinessHours>({
    monday: currentHours.monday || { open: '09:00', close: '17:00' },
    tuesday: currentHours.tuesday || { open: '09:00', close: '17:00' },
    wednesday: currentHours.wednesday || { open: '09:00', close: '17:00' },
    thursday: currentHours.thursday || { open: '09:00', close: '17:00' },
    friday: currentHours.friday || { open: '09:00', close: '17:00' },
    saturday: currentHours.saturday || { open: '09:00', close: '17:00', closed: true },
    sunday: currentHours.sunday || { open: '09:00', close: '17:00', closed: true },
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleClosed = (day: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day]?.closed,
      },
    }));
  };

  const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleCopyToAll = (day: string) => {
    const sourceTimes = hours[day as keyof BusinessHours];
    if (!sourceTimes) return;

    const newHours = { ...hours };
    DAYS.forEach(d => {
      if (d !== day) {
        newHours[d] = {
          open: sourceTimes.open,
          close: sourceTimes.close,
          closed: sourceTimes.closed,
        };
      }
    });
    setHours(newHours);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(hours);
      onClose();
    } catch (error) {
      console.error('Failed to save hours:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      title="Business Hours"
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {DAYS.map((day) => {
          const dayHours = hours[day];
          const isClosed = dayHours?.closed || false;

          return (
            <div
              key={day}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="w-24 font-medium text-sm">
                {DAY_LABELS[day]}
              </div>

              <div className="flex items-center gap-2 flex-1">
                <input
                  type="checkbox"
                  checked={isClosed}
                  onChange={() => handleToggleClosed(day)}
                  className="rounded"
                  id={`${day}-closed`}
                />
                <label htmlFor={`${day}-closed`} className="text-sm text-gray-600">
                  Closed
                </label>
              </div>

              {!isClosed && (
                <>
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-gray-400" />
                    <input
                      type="time"
                      value={dayHours?.open || '09:00'}
                      onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={dayHours?.close || '17:00'}
                      onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  </div>

                  <button
                    onClick={() => handleCopyToAll(day)}
                    className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                  >
                    Copy to all
                  </button>
                </>
              )}
            </div>
          );
        })}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Set your regular business hours here. Customers will see when you're open on your profile.
          </p>
        </div>
      </div>
    </BaseModal>
  );
}
