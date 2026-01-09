import React, { useState } from 'react';
import { Star, Upload, X } from 'lucide-react';
import type { CreateReviewInput } from '../../types/businessSocial';
import { businessSocialService } from '../../services/businessSocial';
import { logger } from '../../lib/logger';

interface ReviewSubmissionFormProps {
  businessId: string;
  productId?: string;
  onSubmit: () => void;
  onCancel?: () => void;
}

export function ReviewSubmissionForm({
  businessId,
  productId,
  onSubmit,
  onCancel
}: ReviewSubmissionFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateReviewInput = {
        business_id: businessId,
        product_id: productId,
        rating,
        review_text: reviewText.trim() || undefined,
        images: images.length > 0 ? images : undefined
      };

      await businessSocialService.createReview(input);
      onSubmit();
    } catch (err) {
      logger.error('Failed to submit review:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #dbdbdb',
      padding: '24px'
    }}>
      <h3 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '20px',
        margin: '0 0 20px 0'
      }}>
        Write a Review
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px'
          }}>
            Your Rating *
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <Star
                  size={32}
                  fill={(hoverRating || rating) >= star ? '#ffc107' : 'none'}
                  stroke={(hoverRating || rating) >= star ? '#ffc107' : '#dbdbdb'}
                  style={{ transition: 'all 0.2s' }}
                />
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Your Review
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this business..."
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '12px',
              border: '1px solid #dbdbdb',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none'
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#0095f6'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#dbdbdb'; }}
          />
          <div style={{
            fontSize: '12px',
            color: '#8e8e8e',
            marginTop: '4px'
          }}>
            {reviewText.length}/1000 characters
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Add Photos (Optional)
          </label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '12px'
          }}>
            {images.map((image, index) => (
              <div key={index} style={{ position: 'relative' }}>
                <img
                  src={image}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    border: '1px solid #dbdbdb'
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {images.length < 5 && (
              <label style={{
                width: '100%',
                height: '100px',
                borderRadius: '8px',
                border: '2px dashed #dbdbdb',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                background: '#fafafa',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#0095f6';
                e.currentTarget.style.background = '#f0f8ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dbdbdb';
                e.currentTarget.style.background = '#fafafa';
              }}
              >
                <Upload size={24} color="#8e8e8e" />
                <span style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '4px' }}>
                  Add Photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
            )}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#8e8e8e',
            marginTop: '8px'
          }}>
            You can upload up to 5 photos
          </div>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00',
            fontSize: '14px',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              style={{
                padding: '10px 24px',
                background: 'white',
                border: '1px solid #dbdbdb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || rating === 0}
            style={{
              padding: '10px 24px',
              background: rating === 0 || isSubmitting ? '#b0d4f1' : '#0095f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: rating === 0 || isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
