/**
 * Storefront Service
 *
 * Manages public storefront configuration, pages, navigation, and banners.
 * Provides customer-facing store customization and content management.
 */

import { BaseService } from '../base/BaseService';
import { logger } from '../../lib/logger';

export interface StorefrontSettings {
  id: string;
  business_id: string;
  subdomain: string | null;
  custom_domain: string | null;
  store_name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  font_family: string;
  currency: string;
  locale: string;
  timezone: string;
  contact_email: string | null;
  contact_phone: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  social_whatsapp: string | null;
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorefrontPage {
  id: string;
  business_id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  page_type: 'custom' | 'about' | 'contact' | 'faq' | 'terms' | 'privacy';
  meta_title: string | null;
  meta_description: string | null;
  active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface StorefrontNavigation {
  id: string;
  business_id: string;
  menu_location: 'header' | 'footer' | 'mobile';
  label: string;
  link_type: 'page' | 'category' | 'external' | 'custom';
  link_target: string | null;
  page_id: string | null;
  category_id: string | null;
  parent_id: string | null;
  display_order: number;
  icon: string | null;
  active: boolean;
  created_at: string;
}

export interface StorefrontBanner {
  id: string;
  business_id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  mobile_image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  background_color: string | null;
  text_color: string | null;
  display_order: number;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStorefrontInput {
  business_id: string;
  subdomain: string;
  store_name: string;
  tagline?: string;
  description?: string;
}

export interface UpdateStorefrontInput {
  store_name?: string;
  tagline?: string;
  description?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  contact_email?: string;
  contact_phone?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_whatsapp?: string;
  meta_title?: string;
  meta_description?: string;
}

export interface CreatePageInput {
  business_id: string;
  title: string;
  content?: string;
  excerpt?: string;
  page_type?: 'custom' | 'about' | 'contact' | 'faq' | 'terms' | 'privacy';
}

export interface CreateNavigationInput {
  business_id: string;
  menu_location: 'header' | 'footer' | 'mobile';
  label: string;
  link_type: 'page' | 'category' | 'external' | 'custom';
  link_target?: string;
  page_id?: string;
  category_id?: string;
  parent_id?: string;
  display_order?: number;
}

export interface CreateBannerInput {
  business_id: string;
  title: string;
  subtitle?: string;
  image_url: string;
  mobile_image_url?: string;
  button_text?: string;
  button_link?: string;
  display_order?: number;
  start_date?: string;
  end_date?: string;
}

export class StorefrontService extends BaseService {
  // ===== Storefront Settings =====

  async getSettings(businessId: string): Promise<StorefrontSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('storefront_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get storefront settings:', error);
      throw error;
    }
  }

  async getSettingsBySubdomain(subdomain: string): Promise<StorefrontSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('storefront_settings')
        .select('*')
        .eq('subdomain', subdomain)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get storefront by subdomain:', error);
      throw error;
    }
  }

  async getSettingsByDomain(domain: string): Promise<StorefrontSettings | null> {
    try {
      const { data, error } = await this.supabase
        .from('storefront_settings')
        .select('*')
        .eq('custom_domain', domain)
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get storefront by domain:', error);
      throw error;
    }
  }

  async createStorefront(input: CreateStorefrontInput): Promise<StorefrontSettings> {
    try {
      const slug = this.generateSlug(input.subdomain);

      const { data, error } = await this.supabase
        .from('storefront_settings')
        .insert({
          business_id: input.business_id,
          subdomain: slug,
          store_name: input.store_name,
          tagline: input.tagline,
          description: input.description,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Storefront created', {
        storefrontId: data.id,
        subdomain: slug
      });
      return data;
    } catch (error) {
      logger.error('Failed to create storefront:', error);
      throw error;
    }
  }

  async updateStorefront(
    businessId: string,
    updates: UpdateStorefrontInput
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('storefront_settings')
        .update(updates)
        .eq('business_id', businessId);

      if (error) throw error;

      logger.info('Storefront updated', { businessId });
    } catch (error) {
      logger.error('Failed to update storefront:', error);
      throw error;
    }
  }

  // ===== Storefront Pages =====

  async listPages(businessId: string, activeOnly: boolean = true): Promise<StorefrontPage[]> {
    try {
      let query = this.supabase
        .from('storefront_pages')
        .select('*')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list pages:', error);
      throw error;
    }
  }

  async getPage(businessId: string, slug: string): Promise<StorefrontPage | null> {
    try {
      const { data, error } = await this.supabase
        .from('storefront_pages')
        .select('*')
        .eq('business_id', businessId)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to get page:', error);
      throw error;
    }
  }

  async createPage(input: CreatePageInput): Promise<StorefrontPage> {
    try {
      const slug = this.generateSlug(input.title);

      const { data, error } = await this.supabase
        .from('storefront_pages')
        .insert({
          business_id: input.business_id,
          title: input.title,
          slug,
          content: input.content,
          excerpt: input.excerpt,
          page_type: input.page_type || 'custom',
          active: true,
          display_order: 0
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Page created', { pageId: data.id, slug });
      return data;
    } catch (error) {
      logger.error('Failed to create page:', error);
      throw error;
    }
  }

  async updatePage(
    pageId: string,
    updates: Partial<CreatePageInput>
  ): Promise<void> {
    try {
      const updateData: any = { ...updates };

      if (updates.title) {
        updateData.slug = this.generateSlug(updates.title);
      }

      const { error } = await this.supabase
        .from('storefront_pages')
        .update(updateData)
        .eq('id', pageId);

      if (error) throw error;

      logger.info('Page updated', { pageId });
    } catch (error) {
      logger.error('Failed to update page:', error);
      throw error;
    }
  }

  async deletePage(pageId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('storefront_pages')
        .delete()
        .eq('id', pageId);

      if (error) throw error;

      logger.info('Page deleted', { pageId });
    } catch (error) {
      logger.error('Failed to delete page:', error);
      throw error;
    }
  }

  // ===== Navigation =====

  async listNavigation(
    businessId: string,
    menuLocation?: 'header' | 'footer' | 'mobile'
  ): Promise<StorefrontNavigation[]> {
    try {
      let query = this.supabase
        .from('storefront_navigation')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (menuLocation) {
        query = query.eq('menu_location', menuLocation);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list navigation:', error);
      throw error;
    }
  }

  async createNavigation(input: CreateNavigationInput): Promise<StorefrontNavigation> {
    try {
      const { data, error } = await this.supabase
        .from('storefront_navigation')
        .insert({
          business_id: input.business_id,
          menu_location: input.menu_location,
          label: input.label,
          link_type: input.link_type,
          link_target: input.link_target,
          page_id: input.page_id,
          category_id: input.category_id,
          parent_id: input.parent_id,
          display_order: input.display_order || 0,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Navigation item created', { navId: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create navigation:', error);
      throw error;
    }
  }

  async updateNavigation(
    navId: string,
    updates: Partial<CreateNavigationInput>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('storefront_navigation')
        .update(updates)
        .eq('id', navId);

      if (error) throw error;

      logger.info('Navigation updated', { navId });
    } catch (error) {
      logger.error('Failed to update navigation:', error);
      throw error;
    }
  }

  async deleteNavigation(navId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('storefront_navigation')
        .delete()
        .eq('id', navId);

      if (error) throw error;

      logger.info('Navigation deleted', { navId });
    } catch (error) {
      logger.error('Failed to delete navigation:', error);
      throw error;
    }
  }

  // ===== Banners =====

  async listBanners(businessId: string, activeOnly: boolean = true): Promise<StorefrontBanner[]> {
    try {
      let query = this.supabase
        .from('storefront_banners')
        .select('*')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });

      if (activeOnly) {
        query = query.eq('active', true);
        const now = new Date().toISOString();
        query = query.or(`start_date.is.null,start_date.lte.${now}`);
        query = query.or(`end_date.is.null,end_date.gte.${now}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      logger.error('Failed to list banners:', error);
      throw error;
    }
  }

  async createBanner(input: CreateBannerInput): Promise<StorefrontBanner> {
    try {
      const { data, error } = await this.supabase
        .from('storefront_banners')
        .insert({
          business_id: input.business_id,
          title: input.title,
          subtitle: input.subtitle,
          image_url: input.image_url,
          mobile_image_url: input.mobile_image_url,
          button_text: input.button_text,
          button_link: input.button_link,
          display_order: input.display_order || 0,
          start_date: input.start_date,
          end_date: input.end_date,
          active: true
        })
        .select()
        .single();

      if (error) throw error;

      logger.info('Banner created', { bannerId: data.id });
      return data;
    } catch (error) {
      logger.error('Failed to create banner:', error);
      throw error;
    }
  }

  async updateBanner(
    bannerId: string,
    updates: Partial<CreateBannerInput>
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('storefront_banners')
        .update(updates)
        .eq('id', bannerId);

      if (error) throw error;

      logger.info('Banner updated', { bannerId });
    } catch (error) {
      logger.error('Failed to update banner:', error);
      throw error;
    }
  }

  async deleteBanner(bannerId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('storefront_banners')
        .delete()
        .eq('id', bannerId);

      if (error) throw error;

      logger.info('Banner deleted', { bannerId });
    } catch (error) {
      logger.error('Failed to delete banner:', error);
      throw error;
    }
  }

  // ===== Helper Methods =====

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
}
