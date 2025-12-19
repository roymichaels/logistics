import React, { useState, useRef, useEffect } from 'react';

import { HebrewOrderParser, parseHebrewOrder, ParsingResult, ParsedOrder } from '../lib/orderTextParser';
import { DataStore } from '../data/types';
import { useAppServices } from '../context/AppServicesContext';
import { logger } from '../lib/logger';
import { haptic } from '../utils/haptic';

interface OrderCreationWizardProps {
  dataStore: DataStore;
  onOrderCreated: (order: any) => void;
  onCancel: () => void;
}

type Step = 'input' | 'preview' | 'confirm' | 'success';

export function OrderCreationWizard({
  dataStore,
  onOrderCreated,
  onCancel
}: OrderCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('input');
  const [inputText, setInputText] = useState('');
  const [parsingResult, setParsingResult] = useState<ParsingResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<ParsedOrder | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { currentBusinessId } = useAppServices();
  const businessId = currentBusinessId ?? undefined;

  useEffect(() => {
    if (currentStep === 'input' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [currentStep]);

  const sampleText = `כתובת: רחוב הרצל 15 תל אביב
איש קשר: דני כהן 052-1234567
הזמנה:
1. 2 ק"ג עגבניות
2. 1 ק"ג מלפפונים
3. 5 יח פלפלים ירוקים
לתשלום: 45 ש"ח
שעת ההזמנה: 14:30
בון של מרכולית דני
מספר הזמנה: #12345`;

  const handleTextInput = (text: string) => {
    setInputText(text);
  };

  const handlePasteExample = () => {
    setInputText(sampleText);
    haptic();
  };

  const handleParseText = async () => {
    if (!inputText.trim()) {
      haptic();
      return;
    }

    setIsProcessing(true);
    try {
      const result = await parseHebrewOrder(inputText, dataStore, businessId);
      setParsingResult(result);
      setEditedOrder(result.data);

      if (result.success && result.data) {
        setCurrentStep('preview');
      } else {
        // Stay on input step but show errors
        setCurrentStep('input');
      }
    } catch (error) {
      logger.error('Parsing failed:', error);
      setParsingResult({
        success: false,
        confidence: 0,
        data: null,
        errors: ['שגיאה בעיבוד הטקסט'],
        warnings: [],
        originalText: inputText
      });
    } finally {
      setIsProcessing(false);
      haptic();
    }
  };

  const handleEditOrder = (field: keyof ParsedOrder, value: any) => {
    if (!editedOrder) return;

    setEditedOrder({
      ...editedOrder,
      [field]: value
    });
  };

  const handleEditItem = (index: number, field: string, value: any) => {
    if (!editedOrder?.items) return;

    const newItems = [...editedOrder.items];
    newItems[index] = { ...newItems[index], [field]: value };

    setEditedOrder({
      ...editedOrder,
      items: newItems
    });
  };

  const handleRemoveItem = (index: number) => {
    if (!editedOrder?.items) return;

    const newItems = editedOrder.items.filter((_, i) => i !== index);
    setEditedOrder({
      ...editedOrder,
      items: newItems
    });
    haptic();
  };

  const handleAddItem = () => {
    if (!editedOrder) return;

    const newItems = [
      ...editedOrder.items,
      { quantity: 1, unit: 'יח\'', name: '' }
    ];

    setEditedOrder({
      ...editedOrder,
      items: newItems
    });
    haptic();
  };

  const handleCreateOrder = async () => {
    if (!editedOrder) return;

    setIsProcessing(true);
    try {
      // Generate order number if not provided
      const orderNumber = editedOrder.orderNumber ||
        `ORD-${Date.now().toString(36).toUpperCase()}`;

      const orderData = {
        customer_name: editedOrder.contact,
        customer_phone: editedOrder.phone || '',
        customer_address: editedOrder.address,
        items: editedOrder.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          notes: item.notes
        })),
        total_amount: editedOrder.totalAmount || 0,
        currency: editedOrder.currency || 'ILS',
        order_number: orderNumber,
        notes: editedOrder.notes || '',
        status: 'new',
        business_id: businessId,
        parsed_from_text: true,
        parsing_metadata: {
          confidence: parsingResult?.confidence || 0,
          original_text: inputText,
          parsing_errors: parsingResult?.errors || [],
          parsing_warnings: parsingResult?.warnings || []
        },
        created_by: 'current_user' // In real app, get from auth
      };

      // Save parsing log
      if (businessId) {
        await dataStore.createOrderParsingLog?.({
          business_id: businessId,
          original_text: inputText,
          parsed_data: editedOrder,
          parsing_confidence: parsingResult?.confidence || 0,
          parsing_errors: parsingResult?.errors || []
        });
      }

      // Create the order
      const createdOrder = await dataStore.createOrder?.(orderData as any);

      onOrderCreated(createdOrder);
      setCurrentStep('success');
      haptic();

    } catch (error) {
      logger.error('Failed to create order:', error);
      // Show error but don't change step
    } finally {
      setIsProcessing(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#34c759';
    if (confidence >= 0.6) return '#ff9500';
    return '#ff3b30';
  };

  const renderInputStep = () => (
    <div style={{ padding: '16px', direction: 'rtl' }}>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: '20px',
        fontWeight: '600',
        color: theme.text_color,
        textAlign: 'center'
      }}>
        📝 הזמנה חדשה מטקסט
      </h2>

      <div style={{
        padding: '12px',
        backgroundColor: theme.secondary_bg_color,
        borderRadius: '12px',
        marginBottom: '16px',
        fontSize: '14px',
        color: theme.text_color,
        lineHeight: '1.4'
      }}>
        <strong>הדבק או הקלד טקסט הזמנה בפורמט:</strong>
        <br />
        • כתובת: [כתובת משלוח]
        <br />
        • איש קשר: [שם ליצירת קשר]
        <br />
        • הזמנה: [רשימת פריטים]
        <br />
        • לתשלום: [סכום ומטבע]
      </div>

      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => handleTextInput(e.target.value)}
        placeholder="הדבק כאן טקסט של הזמנה..."
        style={{
          width: '100%',
          minHeight: '200px',
          padding: '12px',
          border: `1px solid ${theme.hint_color}40`,
          borderRadius: '12px',
          backgroundColor: theme.bg_color,
          color: theme.text_color,
          fontSize: '14px',
          fontFamily: 'monospace',
          resize: 'vertical',
          direction: 'rtl'
        }}
      />

      <button
        onClick={handlePasteExample}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: theme.secondary_bg_color,
          color: theme.text_color,
          border: `1px solid ${theme.hint_color}40`,
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
          marginTop: '12px'
        }}
      >
        📋 הדבק דוגמה
      </button>

      {parsingResult && !parsingResult.success && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#ff3b3020',
          borderRadius: '8px',
          border: `1px solid #ff3b30`,
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            color: '#ff3b30'
          }}>
            🚨 שגיאות בעיבוד:
          </h4>
          {parsingResult.errors.map((error, index) => (
            <div key={index} style={{
              fontSize: '12px',
              color: theme.text_color,
              marginBottom: '4px'
            }}>
              • {error}
            </div>
          ))}

          {parsingResult.warnings.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <h5 style={{
                margin: '0 0 8px 0',
                fontSize: '12px',
                color: '#ff9500'
              }}>
                ⚠️ התראות:
              </h5>
              {parsingResult.warnings.map((warning, index) => (
                <div key={index} style={{
                  fontSize: '11px',
                  color: theme.hint_color,
                  marginBottom: '4px'
                }}>
                  • {warning}
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <h5 style={{
              margin: '0 0 8px 0',
              fontSize: '12px',
              color: theme.text_color
            }}>
              💡 הצעות לשיפור:
            </h5>
            {HebrewOrderParser.suggestCorrections(inputText).map((suggestion, index) => (
              <div key={index} style={{
                fontSize: '11px',
                color: theme.hint_color,
                marginBottom: '4px'
              }}>
                • {suggestion}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '24px'
      }}>
        <button
          onClick={onCancel}
          disabled={isProcessing}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: theme.secondary_bg_color,
            color: theme.text_color,
            border: `1px solid ${theme.hint_color}40`,
            borderRadius: '8px',
            fontSize: '16px',
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            opacity: isProcessing ? 0.6 : 1
          }}
        >
          ביטול
        </button>

        <button
          onClick={handleParseText}
          disabled={!inputText.trim() || isProcessing}
          style={{
            flex: 2,
            padding: '12px',
            backgroundColor: inputText.trim() && !isProcessing
              ? theme.button_color
              : theme.hint_color,
            color: theme.button_text_color,
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: inputText.trim() && !isProcessing
              ? 'pointer'
              : 'not-allowed',
            opacity: inputText.trim() && !isProcessing ? 1 : 0.6
          }}
        >
          {isProcessing ? 'מעבד...' : 'עבד טקסט'}
        </button>
      </div>
    </div>
  );

  const renderPreviewStep = () => {
    if (!editedOrder || !parsingResult) return null;

    return (
      <div style={{ padding: '16px', direction: 'rtl' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: theme.text_color
          }}>
            ✅ תצוגה מקדימה
          </h2>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: getConfidenceColor(parsingResult.confidence) + '20',
            borderRadius: '12px',
            border: `1px solid ${getConfidenceColor(parsingResult.confidence)}40`
          }}>
            <span style={{ fontSize: '12px' }}>🎯</span>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: getConfidenceColor(parsingResult.confidence)
            }}>
              {Math.round(parsingResult.confidence * 100)}% דיוק
            </span>
          </div>
        </div>

        {/* Order Details */}
        <div style={{
          backgroundColor: theme.secondary_bg_color,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: theme.hint_color,
              marginBottom: '4px'
            }}>
              איש קשר
            </label>
            <input
              type="text"
              value={editedOrder.contact}
              onChange={(e) => handleEditOrder('contact', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '6px',
                backgroundColor: theme.bg_color,
                color: theme.text_color
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: theme.hint_color,
              marginBottom: '4px'
            }}>
              טלפון
            </label>
            <input
              type="text"
              value={editedOrder.phone || ''}
              onChange={(e) => handleEditOrder('phone', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '6px',
                backgroundColor: theme.bg_color,
                color: theme.text_color
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: theme.hint_color,
              marginBottom: '4px'
            }}>
              כתובת משלוח
            </label>
            <input
              type="text"
              value={editedOrder.address}
              onChange={(e) => handleEditOrder('address', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: `1px solid ${theme.hint_color}40`,
                borderRadius: '6px',
                backgroundColor: theme.bg_color,
                color: theme.text_color
              }}
            />
          </div>
        </div>

        {/* Items */}
        <div style={{
          backgroundColor: theme.secondary_bg_color,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: '600',
              color: theme.text_color
            }}>
              פריטים בהזמנה
            </h3>
            <button
              onClick={handleAddItem}
              style={{
                padding: '6px 12px',
                backgroundColor: theme.button_color,
                color: theme.button_text_color,
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + הוסף פריט
            </button>
          </div>

          {editedOrder.items.map((item, index) => (
            <div key={index} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 100px 40px',
              gap: '8px',
              alignItems: 'center',
              padding: '8px',
              backgroundColor: theme.bg_color,
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <input
                type="text"
                value={item.name}
                onChange={(e) => handleEditItem(index, 'name', e.target.value)}
                placeholder="שם המוצר"
                style={{
                  padding: '6px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '4px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color,
                  fontSize: '14px'
                }}
              />

              <input
                type="number"
                value={item.quantity}
                onChange={(e) => handleEditItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                style={{
                  padding: '6px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '4px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color,
                  fontSize: '14px'
                }}
              />

              <input
                type="text"
                value={item.unit}
                onChange={(e) => handleEditItem(index, 'unit', e.target.value)}
                style={{
                  padding: '6px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '4px',
                  backgroundColor: theme.secondary_bg_color,
                  color: theme.text_color,
                  fontSize: '14px'
                }}
              />

              <button
                onClick={() => handleRemoveItem(index)}
                style={{
                  padding: '6px',
                  backgroundColor: '#ff3b30',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Payment Info */}
        <div style={{
          backgroundColor: theme.secondary_bg_color,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: theme.hint_color,
                marginBottom: '4px'
              }}>
                סכום לתשלום
              </label>
              <input
                type="number"
                value={editedOrder.totalAmount || 0}
                onChange={(e) => handleEditOrder('totalAmount', parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '6px',
                  backgroundColor: theme.bg_color,
                  color: theme.text_color
                }}
              />
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: theme.hint_color,
                marginBottom: '4px'
              }}>
                מטבע
              </label>
              <select
                value={editedOrder.currency}
                onChange={(e) => handleEditOrder('currency', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: `1px solid ${theme.hint_color}40`,
                  borderRadius: '6px',
                  backgroundColor: theme.bg_color,
                  color: theme.text_color
                }}
              >
                <option value="ILS">ש"ח</option>
                <option value="USD">דולר</option>
                <option value="EUR">יורו</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={() => setCurrentStep('input')}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: theme.secondary_bg_color,
              color: theme.text_color,
              border: `1px solid ${theme.hint_color}40`,
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            חזור לעריכה
          </button>

          <button
            onClick={handleCreateOrder}
            disabled={isProcessing}
            style={{
              flex: 2,
              padding: '12px',
              backgroundColor: !isProcessing
                ? theme.button_color
                : theme.hint_color,
              color: theme.button_text_color,
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: !isProcessing ? 'pointer' : 'not-allowed',
              opacity: !isProcessing ? 1 : 0.6
            }}
          >
            {isProcessing ? 'יוצר הזמנה...' : 'צור הזמנה'}
          </button>
        </div>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      direction: 'rtl'
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
      <h2 style={{
        margin: '0 0 16px 0',
        fontSize: '24px',
        fontWeight: '600',
        color: theme.text_color
      }}>
        ההזמנה נוצרה בהצלחה!
      </h2>
      <p style={{
        margin: '0 0 32px 0',
        fontSize: '16px',
        color: theme.hint_color,
        lineHeight: '1.4'
      }}>
        ההזמנה נשמרה במערכת ונשלחה לעיבוד.
      </p>

      <button
        onClick={onCancel}
        style={{
          padding: '12px 24px',
          backgroundColor: theme.button_color,
          color: theme.button_text_color,
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        סגור
      </button>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: theme.bg_color,
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {currentStep === 'input' && renderInputStep()}
        {currentStep === 'preview' && renderPreviewStep()}
        {currentStep === 'success' && renderSuccessStep()}
      </div>
    </div>
  );
}