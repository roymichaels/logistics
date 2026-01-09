/**
 * Role-Based Catalog View Component
 *
 * Displays catalog with role-appropriate permissions and actions.
 * Integrates with CatalogService and ProductApprovalService.
 */

import { useState, useEffect } from 'react';
import { hasPermission } from '@/lib/rolePermissions';
import { CatalogService, type Product, type CatalogStats } from '@/services/modules/CatalogService';
import { ProductApprovalService } from '@/services/modules/ProductApprovalService';

interface RoleBasedCatalogViewProps {
  userId: string;
  userRole: string;
  businessId: string;
}

export function RoleBasedCatalogView({ userId, userRole, businessId }: RoleBasedCatalogViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const catalogService = new CatalogService(userId, userRole, businessId);
  const approvalService = new ProductApprovalService(userId, userRole, businessId);

  // Permissions
  const canViewAll = hasPermission(userRole, 'catalog:view_all');
  const canViewActive = hasPermission(userRole, 'catalog:view_active');
  const canCreate = hasPermission(userRole, 'catalog:create');
  const canEditDetails = hasPermission(userRole, 'catalog:edit_details');
  const canEditPricing = hasPermission(userRole, 'catalog:edit_pricing');
  const canEditInventory = hasPermission(userRole, 'catalog:edit_inventory');
  const canDelete = hasPermission(userRole, 'catalog:delete');
  const canPublish = hasPermission(userRole, 'catalog:publish');
  const canExport = hasPermission(userRole, 'catalog:export');
  const canRequestChanges = hasPermission(userRole, 'catalog:request_changes');
  const canApproveChanges = hasPermission(userRole, 'catalog:approve_changes');

  // Determine read-only mode
  const isReadOnly = !canEditDetails && !canEditPricing && !canEditInventory && !canDelete && !canCreate;

  useEffect(() => {
    loadData();
  }, [filter, searchTerm]);

  async function loadData() {
    setLoading(true);
    try {
      const filters: any = {};

      if (filter === 'published') {
        filters.is_visible = true;
      } else if (filter === 'draft') {
        filters.is_visible = false;
      }

      if (searchTerm) {
        filters.search = searchTerm;
      }

      const [productsData, statsData] = await Promise.all([
        catalogService.getProducts(filters),
        catalogService.getCatalogStats(),
      ]);

      setProducts(productsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading catalog:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleVisibility(productId: string, isVisible: boolean) {
    if (!canPublish) {
      if (canRequestChanges) {
        // Create change request
        setShowRequestModal(true);
        return;
      }
      alert('You do not have permission to publish/unpublish products');
      return;
    }

    try {
      await catalogService.toggleProductVisibility(productId, isVisible);
      await loadData();
    } catch (error: any) {
      console.error('Error toggling visibility:', error);
      alert(error.message || 'Failed to toggle visibility');
    }
  }

  async function handleBulkToggleVisibility(isVisible: boolean) {
    if (!canPublish) {
      alert('You do not have permission to publish/unpublish products');
      return;
    }

    if (selectedProducts.length === 0) {
      alert('Please select products first');
      return;
    }

    try {
      await catalogService.bulkToggleVisibility(selectedProducts, isVisible);
      setSelectedProducts([]);
      await loadData();
    } catch (error: any) {
      console.error('Error bulk toggling visibility:', error);
      alert(error.message || 'Failed to toggle visibility');
    }
  }

  async function handleExport() {
    if (!canExport) {
      alert('You do not have permission to export catalog');
      return;
    }

    try {
      const data = await catalogService.exportCatalog('csv');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `catalog-${businessId}-${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error exporting catalog:', error);
      alert(error.message || 'Failed to export catalog');
    }
  }

  function toggleProductSelection(productId: string) {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }

  if (loading) {
    return <div className="p-4">Loading catalog...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Product Catalog</h1>
        <div className="flex items-center gap-2">
          {isReadOnly && (
            <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
              Read-Only Mode
            </div>
          )}
          <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm capitalize">
            {userRole.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Products</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            <div className="text-sm text-gray-600">Inactive</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-orange-600">{stats.out_of_stock}</div>
            <div className="text-sm text-gray-600">Out of Stock</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-blue-600">{stats.published}</div>
            <div className="text-sm text-gray-600">Published</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
            <div className="text-sm text-gray-600">Draft</div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 border rounded"
        />

        {/* Filter */}
        {canViewAll && (
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border rounded"
          >
            <option value="all">All Products</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canCreate && (
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => alert('Create product functionality')}
            >
              + Create Product
            </button>
          )}

          {canExport && (
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={handleExport}
            >
              Export
            </button>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && canPublish && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
          <div className="text-sm">
            <strong>{selectedProducts.length}</strong> product(s) selected
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              onClick={() => handleBulkToggleVisibility(true)}
            >
              Publish Selected
            </button>
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={() => handleBulkToggleVisibility(false)}
            >
              Unpublish Selected
            </button>
            <button
              className="px-3 py-2 text-gray-600 hover:text-gray-800"
              onClick={() => setSelectedProducts([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Permission Info for Limited Roles */}
      {isReadOnly && canRequestChanges && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800">
            You are viewing the catalog in read-only mode. You can request changes which will be reviewed by a manager or business owner.
          </p>
        </div>
      )}

      {canEditInventory && !canEditDetails && !canEditPricing && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            You can update inventory-related information (weight, tracking, etc.) but cannot edit product details or pricing.
          </p>
        </div>
      )}

      {/* Product List */}
      <div className="space-y-2">
        {products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No products found. {canCreate && 'Click "Create Product" to get started.'}
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              className="p-4 bg-white border rounded hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Checkbox */}
                {canPublish && (
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={() => toggleProductSelection(product.id)}
                    className="mt-1"
                  />
                )}

                {/* Image */}
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}

                {/* Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      {product.description && (
                        <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                      )}
                    </div>

                    {/* Status Badges */}
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : product.status === 'out_of_stock'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.status}
                      </span>

                      {product.metadata?.is_visible !== false ? (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <div>
                      Price: <strong>${product.price.toFixed(2)}</strong>
                    </div>
                    {product.compare_at_price && (
                      <div className="text-gray-500 line-through">
                        ${product.compare_at_price.toFixed(2)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    {canEditDetails && (
                      <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                        Edit
                      </button>
                    )}

                    {canEditPricing && (
                      <button className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">
                        Edit Price
                      </button>
                    )}

                    {canPublish && (
                      <button
                        className={`px-3 py-1 text-sm rounded ${
                          product.metadata?.is_visible !== false
                            ? 'bg-gray-600 text-white hover:bg-gray-700'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        onClick={() =>
                          handleToggleVisibility(
                            product.id,
                            product.metadata?.is_visible === false
                          )
                        }
                      >
                        {product.metadata?.is_visible !== false ? 'Unpublish' : 'Publish'}
                      </button>
                    )}

                    {canDelete && (
                      <button className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                        Delete
                      </button>
                    )}

                    {canRequestChanges && !canEditDetails && (
                      <button className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700">
                        Request Change
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
