-- Seed default infrastructure tenant for fresh deployments.
INSERT INTO public.infrastructures (code, slug, display_name, description)
VALUES ('default', 'default', 'Default Infrastructure', 'Initial infrastructure created during migration to multi-tenant core.')
ON CONFLICT (code) DO UPDATE
  SET slug = EXCLUDED.slug,
      display_name = EXCLUDED.display_name,
      description = EXCLUDED.description,
      is_active = TRUE,
      status = 'active';
