import React, { useState } from 'react';
import { BaseModal } from '../BaseModal';
import { MapPin, Navigation } from 'lucide-react';

interface Location {
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

interface EditBusinessLocationModalProps {
  currentLocation: Location;
  onSave: (location: Location) => Promise<void>;
  onClose: () => void;
}

export function EditBusinessLocationModal({
  currentLocation,
  onSave,
  onClose,
}: EditBusinessLocationModalProps) {
  const [location, setLocation] = useState<Location>({
    address: currentLocation.address || '',
    city: currentLocation.city || '',
    state: currentLocation.state || '',
    postal_code: currentLocation.postal_code || '',
    country: currentLocation.country || '',
    latitude: currentLocation.latitude,
    longitude: currentLocation.longitude,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setIsGeolocating(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get your location');
        setIsGeolocating(false);
      }
    );
  };

  const handleSave = async () => {
    if (!location.address?.trim()) {
      alert('Please enter an address');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(location);
      onClose();
    } catch (error) {
      console.error('Failed to save location:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal
      title="Business Location"
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
            disabled={isLoading || !location.address?.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Location'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={location.address}
            onChange={(e) => setLocation({ ...location, address: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={location.city}
              onChange={(e) => setLocation({ ...location, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="San Francisco"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/Province
            </label>
            <input
              type="text"
              value={location.state}
              onChange={(e) => setLocation({ ...location, state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="CA"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code
            </label>
            <input
              type="text"
              value={location.postal_code}
              onChange={(e) => setLocation({ ...location, postal_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="94102"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={location.country}
              onChange={(e) => setLocation({ ...location, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="United States"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Coordinates (Optional)
            </label>
            <button
              onClick={handleGetCurrentLocation}
              disabled={isGeolocating}
              className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Navigation size={16} />
              {isGeolocating ? 'Getting location...' : 'Use my location'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={location.latitude || ''}
                onChange={(e) => setLocation({ ...location, latitude: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="37.7749"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={location.longitude || ''}
                onChange={(e) => setLocation({ ...location, longitude: parseFloat(e.target.value) || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="-122.4194"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Coordinates help customers find you on maps and enable delivery radius calculations.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-700 font-medium mb-1">
                Location Tips
              </p>
              <ul className="text-xs text-blue-600 space-y-1">
                <li>• Make sure your address is accurate for deliveries</li>
                <li>• Add coordinates for better map accuracy</li>
                <li>• Customers can use this to find directions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </BaseModal>
  );
}
