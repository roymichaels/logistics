import React, { useState } from 'react';
import { Box, Typography, Button } from '@/components/atoms';
import { SearchBar } from '@/components/molecules';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type?: string;
  data?: any;
}

export interface MapTemplateProps {
  title: string;
  actions?: React.ReactNode;

  // Map Component (user provides their own map implementation)
  mapComponent: React.ComponentType<{
    markers: MapMarker[];
    selectedMarkerId?: string;
    onMarkerClick: (marker: MapMarker) => void;
    center?: { lat: number; lng: number };
    zoom?: number;
  }>;

  // Markers
  markers: MapMarker[];
  selectedMarkerId?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  renderMarkerDetails?: (marker: MapMarker) => React.ReactNode;

  // Search
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;

  // Sidebar
  sidebar?: {
    title?: string;
    content?: React.ReactNode;
    position?: 'left' | 'right';
    width?: string;
    collapsible?: boolean;
  };

  // Filters/Layers
  layers?: Array<{
    id: string;
    label: string;
    active: boolean;
    onToggle: () => void;
    color?: string;
  }>;

  // Controls
  showZoomControls?: boolean;
  showLayerControls?: boolean;
  showFullscreenToggle?: boolean;

  // Map Options
  defaultCenter?: { lat: number; lng: number };
  defaultZoom?: number;
}

export const MapTemplate: React.FC<MapTemplateProps> = ({
  title,
  actions,
  mapComponent: MapComponent,
  markers,
  selectedMarkerId,
  onMarkerClick,
  renderMarkerDetails,
  searchable = true,
  searchPlaceholder = 'Search location...',
  onSearch,
  sidebar,
  layers = [],
  showZoomControls = true,
  showLayerControls = true,
  showFullscreenToggle = true,
  defaultCenter,
  defaultZoom = 12,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleMarkerClick = (marker: MapMarker) => {
    setSelectedMarker(marker);
    onMarkerClick?.(marker);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const sidebarPosition = sidebar?.position || 'left';
  const sidebarWidth = sidebar?.width || '320px';

  return (
    <Box
      className="map-template"
      style={{
        height: isFullscreen ? '100vh' : '100%',
        display: 'flex',
        flexDirection: 'column',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        left: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 0 : undefined,
        bottom: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : undefined,
        backgroundColor: 'white'
      }}
    >
      {/* Header */}
      <Box style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        zIndex: 10
      }}>
        <Typography variant="h1">{title}</Typography>
        <Box style={{ display: 'flex', gap: '8px' }}>
          {actions}
          {showFullscreenToggle && (
            <Button variant="secondary" size="small" onClick={toggleFullscreen}>
              {isFullscreen ? '⊡ Exit' : '⊞ Fullscreen'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Main Content */}
      <Box style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar */}
        {sidebar && sidebarPosition === 'left' && !isSidebarCollapsed && (
          <Box style={{
            width: sidebarWidth,
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'white'
          }}>
            {sidebar.title && (
              <Box style={{
                padding: '16px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <Typography variant="h3">{sidebar.title}</Typography>
              </Box>
            )}
            <Box style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {sidebar.content}
            </Box>
          </Box>
        )}

        {/* Map Container */}
        <Box style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Search Overlay */}
          {searchable && (
            <Box style={{
              position: 'absolute',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              width: '90%',
              maxWidth: '400px'
            }}>
              <SearchBar
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearch}
              />
            </Box>
          )}

          {/* Layer Controls */}
          {showLayerControls && layers.length > 0 && (
            <Box style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              zIndex: 20,
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <Typography variant="caption" style={{ fontWeight: 600 }}>
                Layers
              </Typography>
              {layers.map((layer) => (
                <label
                  key={layer.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={layer.active}
                    onChange={layer.onToggle}
                  />
                  {layer.color && (
                    <Box style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: layer.color
                    }} />
                  )}
                  <span>{layer.label}</span>
                </label>
              ))}
            </Box>
          )}

          {/* Selected Marker Details */}
          {selectedMarker && renderMarkerDetails && (
            <Box style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              width: '90%',
              maxWidth: '400px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <Button
                variant="text"
                size="small"
                onClick={() => setSelectedMarker(null)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px'
                }}
              >
                ✕
              </Button>
              {renderMarkerDetails(selectedMarker)}
            </Box>
          )}

          {/* Map Component */}
          <MapComponent
            markers={markers}
            selectedMarkerId={selectedMarkerId}
            onMarkerClick={handleMarkerClick}
            center={defaultCenter}
            zoom={defaultZoom}
          />
        </Box>

        {/* Right Sidebar */}
        {sidebar && sidebarPosition === 'right' && !isSidebarCollapsed && (
          <Box style={{
            width: sidebarWidth,
            borderLeft: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'white'
          }}>
            {sidebar.title && (
              <Box style={{
                padding: '16px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <Typography variant="h3">{sidebar.title}</Typography>
              </Box>
            )}
            <Box style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {sidebar.content}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
