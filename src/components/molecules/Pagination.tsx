import React from 'react';
import { Button } from '../atoms/Button';
import { colors, spacing } from '../../design-system';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  showFirstLast?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
}: PaginationProps) {
  const generatePageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    const leftSibling = Math.max(2, currentPage - siblingCount);
    const rightSibling = Math.min(totalPages - 1, currentPage + siblingCount);

    // Add left ellipsis if needed
    if (leftSibling > 2) {
      pages.push('ellipsis');
    }

    // Add pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    // Add right ellipsis if needed
    if (rightSibling < totalPages - 1) {
      pages.push('ellipsis');
    }

    // Always show last page (if more than 1 page)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing[2],
        flexWrap: 'wrap',
      }}
    >
      {showFirstLast && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrevious}
        >
          ««
        </Button>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!canGoPrevious}
      >
        ‹
      </Button>

      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              style={{
                padding: `${spacing[1]} ${spacing[2]}`,
                color: colors.text.tertiary,
              }}
            >
              ...
            </span>
          );
        }

        return (
          <Button
            key={page}
            variant={page === currentPage ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        );
      })}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!canGoNext}
      >
        ›
      </Button>

      {showFirstLast && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
        >
          »»
        </Button>
      )}
    </div>
  );
}
