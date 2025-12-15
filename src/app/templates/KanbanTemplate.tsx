import React, { useState } from 'react';
import { Box, Typography, Button, Badge } from '@/components/atoms';
import { EmptyState } from '@/components/molecules';

export interface KanbanCard {
  id: string;
  [key: string]: any;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  color?: string;
  limit?: number;
  badge?: string | number;
}

export interface KanbanTemplateProps {
  title: string;
  actions?: React.ReactNode;
  columns: KanbanColumn[];
  renderCard: (card: KanbanCard, columnId: string) => React.ReactNode;
  onCardMove?: (cardId: string, fromColumnId: string, toColumnId: string) => void;
  onCardClick?: (card: KanbanCard, columnId: string) => void;
  onAddCard?: (columnId: string) => void;
  emptyColumnState?: React.ReactNode;
  loading?: boolean;
  allowDragDrop?: boolean;
}

export const KanbanTemplate: React.FC<KanbanTemplateProps> = ({
  title,
  actions,
  columns,
  renderCard,
  onCardMove,
  onCardClick,
  onAddCard,
  emptyColumnState,
  loading = false,
  allowDragDrop = true,
}) => {
  const [draggedCard, setDraggedCard] = useState<{
    card: KanbanCard;
    fromColumnId: string;
  } | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const handleDragStart = (card: KanbanCard, columnId: string) => {
    if (!allowDragDrop) return;
    setDraggedCard({ card, fromColumnId: columnId });
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    if (!allowDragDrop || !draggedCard) return;
    e.preventDefault();
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = (e: React.DragEvent, toColumnId: string) => {
    e.preventDefault();
    if (!draggedCard || !onCardMove) return;

    const { card, fromColumnId } = draggedCard;
    if (fromColumnId !== toColumnId) {
      onCardMove(card.id, fromColumnId, toColumnId);
    }

    setDraggedCard(null);
    setDragOverColumnId(null);
  };

  const handleCardClick = (card: KanbanCard, columnId: string) => {
    onCardClick?.(card, columnId);
  };

  return (
    <Box className="kanban-template" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white'
      }}>
        <Typography variant="h1">{title}</Typography>
        {actions && <Box>{actions}</Box>}
      </Box>

      {/* Board */}
      <Box style={{
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '24px',
        backgroundColor: '#f9fafb'
      }}>
        {loading ? (
          <Box style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
          }}>
            <Typography>Loading...</Typography>
          </Box>
        ) : (
          <Box style={{
            display: 'flex',
            gap: '16px',
            height: '100%',
            minWidth: 'min-content'
          }}>
            {columns.map((column) => {
              const isOverLimit = column.limit && column.cards.length >= column.limit;
              const isDragOver = dragOverColumnId === column.id;

              return (
                <Box
                  key={column.id}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  style={{
                    width: '320px',
                    minWidth: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: isDragOver ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    transition: 'border-color 0.2s',
                    maxHeight: '100%'
                  }}
                >
                  {/* Column Header */}
                  <Box style={{
                    padding: '16px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Box style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {column.color && (
                        <Box style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: column.color
                        }} />
                      )}
                      <Typography variant="h3">{column.title}</Typography>
                      <Badge variant="secondary">
                        {column.cards.length}
                        {column.limit && ` / ${column.limit}`}
                      </Badge>
                      {column.badge && (
                        <Badge variant="primary">{column.badge}</Badge>
                      )}
                    </Box>
                    {onAddCard && !isOverLimit && (
                      <Button
                        variant="text"
                        size="small"
                        onClick={() => onAddCard(column.id)}
                      >
                        +
                      </Button>
                    )}
                  </Box>

                  {/* Column Cards */}
                  <Box style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {isOverLimit && (
                      <Box style={{
                        padding: '8px 12px',
                        backgroundColor: '#fef3c7',
                        color: '#92400e',
                        borderRadius: '6px',
                        fontSize: '12px',
                        textAlign: 'center'
                      }}>
                        Limit reached ({column.limit})
                      </Box>
                    )}

                    {column.cards.length === 0 ? (
                      <Box style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: '#9ca3af'
                      }}>
                        {emptyColumnState || (
                          <EmptyState message="No cards" />
                        )}
                      </Box>
                    ) : (
                      column.cards.map((card) => (
                        <Box
                          key={card.id}
                          draggable={allowDragDrop}
                          onDragStart={() => handleDragStart(card, column.id)}
                          onClick={() => handleCardClick(card, column.id)}
                          style={{
                            cursor: allowDragDrop ? 'grab' : 'pointer',
                            opacity: draggedCard?.card.id === card.id ? 0.5 : 1,
                            transition: 'opacity 0.2s'
                          }}
                        >
                          {renderCard(card, column.id)}
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
};
