import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicBusinesses, BusinessRecord } from '../../services/business';
import { logger } from '../../lib/logger';

export default function BusinessDirectory() {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    const loadBusinesses = async () => {
      try {
        setLoading(true);
        const data = await getPublicBusinesses();
        setBusinesses(data);
      } catch (err) {
        logger.error('[BusinessDirectory] Failed to load businesses', err);
      } finally {
        setLoading(false);
      }
    };

    loadBusinesses();
  }, []);

  const filteredBusinesses = businesses.filter((business) => {
    const matchesSearch = business.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      business.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || business.business_type === selectedType;
    return matchesSearch && matchesType;
  });

  const businessTypes = Array.from(new Set(businesses.map(b => b.business_type)));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading businesses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Business Directory</h1>
          <p className="text-xl opacity-90">Discover local businesses and browse their catalogs</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Businesses
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:w-64">
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-gray-600">
            {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'} found
          </p>
        </div>

        {filteredBusinesses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-xl text-gray-600">No businesses found</p>
            <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/business/${business.slug}`}
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                <div
                  className="h-32 bg-gradient-to-r from-blue-600 to-blue-800"
                  style={
                    business.banner_image_url
                      ? { backgroundImage: `url(${business.banner_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : { background: `linear-gradient(to right, ${business.primary_color}, ${business.secondary_color})` }
                  }
                ></div>
                <div className="p-6">
                  <div className="flex items-start space-x-4 mb-4">
                    {business.logo_url ? (
                      <img
                        src={business.logo_url}
                        alt={business.name}
                        className="w-16 h-16 rounded-lg border-2 border-gray-200 bg-white"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg border-2 border-gray-200 bg-gray-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-800 truncate">{business.name}</h3>
                      {business.tagline && (
                        <p className="text-sm text-gray-600 mt-1">{business.tagline}</p>
                      )}
                    </div>
                  </div>
                  {business.description && (
                    <p className="text-gray-700 line-clamp-2 mb-4">{business.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                      {business.business_type.charAt(0).toUpperCase() + business.business_type.slice(1)}
                    </span>
                    <span className="text-blue-600 font-medium flex items-center">
                      View Catalog
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
