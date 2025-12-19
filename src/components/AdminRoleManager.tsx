import React, { useState } from 'react';
import { roleAssignmentManager, type UserRole } from '../lib/roleAssignment';
import { logger } from '../lib/logger';

const AVAILABLE_ROLES: UserRole[] = [
  'infrastructure_owner',
  'business_owner',
  'manager',
  'warehouse',
  'dispatcher',
  'sales',
  'customer_service',
  'driver',
  'customer',
];

export function AdminRoleManager() {
  const [walletInput, setWalletInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [assignments, setAssignments] = useState(roleAssignmentManager.getAllAssignments());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAssignRole = () => {
    if (!walletInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter a wallet address' });
      return;
    }

    try {
      roleAssignmentManager.assignRoleToWallet(walletInput.toLowerCase(), selectedRole);
      setAssignments(roleAssignmentManager.getAllAssignments());
      setMessage({ type: 'success', text: `Role assigned: ${walletInput} → ${selectedRole}` });
      setWalletInput('');
      logger.info(`[ADMIN] Role assigned: ${walletInput} → ${selectedRole}`);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to assign role' });
      logger.error('[ADMIN] Role assignment failed', error);
    }
  };

  const handleRevokeRole = (walletAddress: string) => {
    try {
      roleAssignmentManager.revokeRole(walletAddress);
      setAssignments(roleAssignmentManager.getAllAssignments());
      setMessage({ type: 'success', text: `Role revoked for ${walletAddress}` });
      logger.info(`[ADMIN] Role revoked: ${walletAddress}`);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to revoke role' });
      logger.error('[ADMIN] Role revocation failed', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Admin - Role Assignment Manager</h2>

      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3>Assign Role to Wallet</h3>

        <div style={{ marginBottom: '10px' }}>
          <label>Wallet Address:</label>
          <input
            type="text"
            placeholder="0x..."
            value={walletInput}
            onChange={(e) => setWalletInput(e.target.value)}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Role:</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as UserRole)}
            style={{ display: 'block', width: '100%', padding: '8px', marginTop: '5px' }}
          >
            {AVAILABLE_ROLES.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleAssignRole}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Assign Role
        </button>
      </div>

      {message && (
        <div style={{
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          borderRadius: '4px'
        }}>
          {message.text}
        </div>
      )}

      <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h3>Current Role Assignments</h3>

        {Object.entries(assignments).length === 0 ? (
          <p style={{ color: '#666' }}>No role assignments yet</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Wallet Address</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '10px', borderBottom: '1px solid #ddd' }}>Assigned At</th>
                <th style={{ textAlign: 'center', padding: '10px', borderBottom: '1px solid #ddd' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(assignments).map(([wallet, assignment]) => (
                <tr key={wallet}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <code>{wallet.slice(0, 10)}...{wallet.slice(-8)}</code>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    <strong>{assignment.role}</strong>
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                    {new Date(assignment.assignedAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRevokeRole(wallet)}
                      style={{
                        padding: '5px 10px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
