import React, { useState, useEffect } from 'react';
import { useAppServices } from '../../context/AppServicesContext';
import { Order } from '../../data/types';

export function SupportConsole() {
  const { dataStore } = useAppServices();
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  useEffect(() => {
    loadTickets();
  }, [dataStore]);

  const loadTickets = async () => {
    setTickets([
      {
        id: '1',
        customerName: 'Customer A',
        orderId: '123',
        issue: 'Order not received',
        status: 'open',
        priority: 'high',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        customerName: 'Customer B',
        orderId: '456',
        issue: 'Wrong item delivered',
        status: 'pending',
        priority: 'medium',
        createdAt: new Date().toISOString(),
      },
    ]);
  };

  const handleLookupOrder = async (orderId: string) => {
    if (!dataStore?.getOrder) return;

    try {
      const order = await dataStore.getOrder(orderId);
      console.log('Order found:', order);
    } catch (error) {
      console.error('Order not found:', error);
    }
  };

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      color: '#E7E9EA',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
        }}>
          Support Console
        </h1>
        <input
          type="text"
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: '10px 16px',
            borderRadius: '20px',
            border: '1px solid #38444D',
            background: '#192734',
            color: '#E7E9EA',
            fontSize: '14px',
            width: '300px',
          }}
        />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '16px',
      }}>
        <div style={{
          background: '#1E2732',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #38444D',
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
          }}>
            Tickets
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                style={{
                  padding: '12px',
                  background: selectedTicket?.id === ticket.id ? '#192734' : 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: '1px solid #38444D',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '4px',
                }}>
                  <span style={{ fontWeight: '600' }}>{ticket.customerName}</span>
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: ticket.priority === 'high' ? '#F91880' : '#FFB800',
                    color: '#FFFFFF',
                  }}>
                    {ticket.priority}
                  </span>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#8899A6',
                }}>
                  {ticket.issue}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: '#1E2732',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid #38444D',
        }}>
          {selectedTicket ? (
            <>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '16px',
              }}>
                Ticket Details
              </h2>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Customer:</strong> {selectedTicket.customerName}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Order ID:</strong>{' '}
                  <button
                    onClick={() => handleLookupOrder(selectedTicket.orderId)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#1D9BF0',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    {selectedTicket.orderId}
                  </button>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Issue:</strong> {selectedTicket.issue}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Status:</strong> {selectedTicket.status}
                </div>
              </div>
              <button
                style={{
                  padding: '10px 20px',
                  background: '#1D9BF0',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  marginRight: '8px',
                }}
              >
                Modify Order
              </button>
              <button
                style={{
                  padding: '10px 20px',
                  background: 'transparent',
                  color: '#1D9BF0',
                  border: '1px solid #1D9BF0',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                Escalate
              </button>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#8899A6',
            }}>
              Select a ticket to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
