import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBusinessBySlug, getPublicBusinessCatalog, BusinessRecord } from '../../services/business';
import { logger } from '../../lib/logger';

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
}

export default function PublicBusinessPage() {
  const { slug } = useParams<{ slug: string }>();
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadBusinessData = async () => {
      if (!slug) {
        setError('Business not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const businessData = await getBusinessBySlug(slug);

        if (!businessData) {
          setError('Business not found or not public');
          setLoading(false);
          return;
        }

        setBusiness(businessData);

        const catalogData = await getPublicBusinessCatalog(businessData.id);
        setProducts(catalogData);
      } catch (err) {
        logger.error('[PublicBusinessPage] Failed to load business data', err);
        setError('Failed to load business information');
      } finally {
        setLoading(false);
      }
    };

    loadBusinessData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading business...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Business Not Found</h1>
          <p className="text-gray-600 mb-8">{error || 'This business page does not exist or is not public.'}</p>
          <Link
            to="/directory"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Browse All Businesses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div
        className="w-full h-64 bg-gradient-to-r from-blue-600 to-blue-800 relative"
        style={
          business.banner_image_url
            ? { backgroundImage: `url(${business.banner_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { background: `linear-gradient(to right, ${business.primary_color}, ${business.secondary_color})` }
        }
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative h-full max-w-7xl mx-auto px-4 flex items-end pb-8">
          <div className="flex items-center space-x-6">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt={business.name}
                className="w-24 h-24 rounded-lg border-4 border-white shadow-lg bg-white"
              />
            )}
            <div className="text-white">
              <h1 className="text-4xl font-bold mb-2">{business.name}</h1>
              {business.tagline && (
                <p className="text-xl opacity-90">{business.tagline}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">About Us</h2>
          {business.description ? (
            <p className="text-gray-700 leading-relaxed">{business.description}</p>
          ) : (
            <p className="text-gray-500 italic">No description available</p>
          )}

          <div className="mt-6 flex flex-wrap gap-6">
            {business.public_email && (
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 mr-2" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${business.public_email}`} className="hover:text-blue-600">
                  {business.public_email}
                </a>
              </div>
            )}
            {business.public_phone && (
              <div className="flex items-center text-gray-700">
                <svg className="w-5 h-5 mr-2" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <a href={`tel:${business.public_phone}`} className="hover:text-blue-600">
                  {business.public_phone}
                </a>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Our Catalog</h2>
            <p className="text-gray-600">{products.length} products</p>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-xl text-gray-600">No products available yet</p>
              <p className="text-gray-500 mt-2">Check back soon for new items!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-800 mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                    )}
                    {product.category && (
                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mb-2">
                        {product.category}
                      </span>
                    )}
                    <p className="text-lg font-bold" style={{ color: business.primary_color }}>
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: business.default_currency
                      }).format(product.price)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
