import React, { useEffect, useMemo, useState } from 'react';
import UnifiedShellRouter from '../migration/UnifiedShellRouter';
import { Surface } from '../components/layout/Surface';
import { Section } from '../components/primitives/Section';
import { Card } from '../components/primitives/Card';
import { usePageTitle } from '../hooks/usePageTitle';
import { mapProductToDetail } from '../adapters/ui/ProductDetailAdapter';
import ProductHeroGallery from '../components/product/ProductHeroGallery';
import ProductPriceBlock from '../components/product/ProductPriceBlock';
import ProductDetailActions from '../components/product/ProductDetailActions';
import ProductInfoSection from '../components/product/ProductInfoSection';
import useReactionStore from '../state/useReactionStore';
import { migrationFlags } from '../migration/flags';

type Props = {
  productId?: string;
  dataStore?: any;
};

function ProductDetailPageContent({ productId, dataStore }: Props) {
  const { setTitle, setSubtitle } = usePageTitle();
  const [product, setProduct] = useState<any>(null);
  const reactions = useReactionStore();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (dataStore?.getProduct && productId) {
        try {
          const prod = await dataStore.getProduct(productId);
          if (!cancelled) setProduct(prod);
        } catch {
          if (!cancelled) setProduct(null);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productId, dataStore]);

  const detail = useMemo(() => mapProductToDetail(product), [product]);

  useEffect(() => {
    if (detail?.title) setTitle(detail.title);
    if (detail?.subtitle) setSubtitle(detail.subtitle);
    if (detail?.id) reactions.markSeen(detail.id);
  }, [detail, setTitle, setSubtitle, reactions]);

  return (
    <Surface>
      <Section title="מוצר">
        <Card>
          <ProductHeroGallery images={detail?.images || []} />
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: 18 }}>{detail?.title}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>{detail?.subtitle}</div>
            <ProductPriceBlock price={detail?.price ?? null} currency={detail?.currency} />
          </div>
        </Card>
      </Section>

      <ProductInfoSection title="תיאור" description={detail?.description || ''} />

      <Section title="פעולות">
        <ProductDetailActions
          product={product}
          onAddToCart={() => {
            // UI-only; cart drawer handled elsewhere
          }}
          onBack={() => window.history.back()}
        />
      </Section>
    </Surface>
  );
}

export default function ProductDetailPageNew(props: Props) {
  return (
    <UnifiedShellRouter>
      <ProductDetailPageContent {...props} />
    </UnifiedShellRouter>
  );
}
