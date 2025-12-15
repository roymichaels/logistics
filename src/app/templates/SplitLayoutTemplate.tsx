import React, { useState } from 'react';
import { Box, Typography, Button } from '@/components/atoms';
import { SearchBar, EmptyState } from '@/components/molecules';

export interface SplitLayoutTemplateProps {
  title?: string;

  // Master Panel (Left)
  masterPanel: {
    header?: React.ReactNode;
    searchable?: boolean;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    items: any[];
    renderItem: (item: any, isSelected: boolean) => React.ReactNode;
    selectedItemId?: string;
    onItemSelect: (item: any) => void;
    emptyState?: React.ReactNode;
    loading?: boolean;
    actions?: React.ReactNode;
  };

  // Detail Panel (Right)
  detailPanel: {
    content: React.ReactNode;
    emptyState?: React.ReactNode;
    loading?: boolean;
  };

  // Layout Options
  masterWidth?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  mobileView?: 'master' | 'detail';
}

export const SplitLayoutTemplate: React.FC<SplitLayoutTemplateProps> = ({
  title,
  masterPanel,
  detailPanel,
  masterWidth = '320px',
  collapsible = true,
  defaultCollapsed = false,
  mobileView = 'master',
}) => {
  const [isMasterCollapsed, setIsMasterCollapsed] = useState(defaultCollapsed);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMobileView, setCurrentMobileView] = useState<'master' | 'detail'>(mobileView);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    masterPanel.onSearch?.(query);
  };

  const handleItemSelect = (item: any) => {
    masterPanel.onItemSelect(item);
    setCurrentMobileView('detail');
  };

  return (
    <Box className="split-layout-template" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header (Optional) */}
      {title && (
        <Box style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h1">{title}</Typography>
        </Box>
      )}

      {/* Split Layout */}
      <Box style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Master Panel (Left) */}
        <Box
          className="master-panel"
          style={{
            width: isMasterCollapsed ? '0' : masterWidth,
            minWidth: isMasterCollapsed ? '0' : masterWidth,
            borderRight: isMasterCollapsed ? 'none' : '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            transition: 'width 0.2s ease',
            '@media (max-width: 768px)': {
              width: currentMobileView === 'master' ? '100%' : '0',
              minWidth: currentMobileView === 'master' ? '100%' : '0',
              position: 'absolute',
              height: '100%',
              backgroundColor: 'white',
              zIndex: 10,
            }
          }}
        >
          {/* Master Header */}
          {masterPanel.header && (
            <Box style={{
              padding: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {masterPanel.header}
            </Box>
          )}

          {/* Search */}
          {masterPanel.searchable && (
            <Box style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
              <SearchBar
                placeholder={masterPanel.searchPlaceholder || 'Search...'}
                value={searchQuery}
                onChange={handleSearch}
              />
            </Box>
          )}

          {/* Actions */}
          {masterPanel.actions && (
            <Box style={{
              padding: '12px 16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {masterPanel.actions}
            </Box>
          )}

          {/* Items List */}
          <Box style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            {masterPanel.loading ? (
              <Box style={{ padding: '40px', textAlign: 'center' }}>
                <Typography>Loading...</Typography>
              </Box>
            ) : masterPanel.items.length === 0 ? (
              masterPanel.emptyState || (
                <Box style={{ padding: '40px', textAlign: 'center' }}>
                  <EmptyState message="No items" />
                </Box>
              )
            ) : (
              masterPanel.items.map((item, index) => (
                <Box
                  key={index}
                  onClick={() => handleItemSelect(item)}
                  style={{ cursor: 'pointer' }}
                >
                  {masterPanel.renderItem(item, item.id === masterPanel.selectedItemId)}
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Toggle Button (Desktop only) */}
        {collapsible && (
          <Button
            variant="text"
            onClick={() => setIsMasterCollapsed(!isMasterCollapsed)}
            style={{
              position: 'absolute',
              left: isMasterCollapsed ? '0' : masterWidth,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 20,
              padding: '8px',
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '0 6px 6px 0',
              '@media (max-width: 768px)': {
                display: 'none'
              }
            }}
          >
            {isMasterCollapsed ? '→' : '←'}
          </Button>
        )}

        {/* Detail Panel (Right) */}
        <Box
          className="detail-panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            '@media (max-width: 768px)': {
              width: currentMobileView === 'detail' ? '100%' : '0',
              position: currentMobileView === 'detail' ? 'relative' : 'absolute',
              left: currentMobileView === 'detail' ? '0' : '100%',
            }
          }}
        >
          {/* Mobile Back Button */}
          <Box
            style={{
              display: 'none',
              '@media (max-width: 768px)': {
                display: currentMobileView === 'detail' ? 'block' : 'none',
                padding: '12px 16px',
                borderBottom: '1px solid #e5e7eb'
              }
            }}
          >
            <Button
              variant="text"
              onClick={() => setCurrentMobileView('master')}
            >
              ← Back
            </Button>
          </Box>

          {/* Detail Content */}
          <Box style={{
            flex: 1,
            overflow: 'auto'
          }}>
            {detailPanel.loading ? (
              <Box style={{ padding: '40px', textAlign: 'center' }}>
                <Typography>Loading...</Typography>
              </Box>
            ) : !masterPanel.selectedItemId && detailPanel.emptyState ? (
              <Box style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                padding: '40px'
              }}>
                {detailPanel.emptyState}
              </Box>
            ) : (
              detailPanel.content
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
