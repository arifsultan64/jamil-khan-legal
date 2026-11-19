import { useEffect } from 'react';

interface SeoMetaOptions {
  title: string;
  description: string;
  type?: 'website' | 'article';
  canonicalPath?: string;
  structuredData?: Record<string, any>;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageSeo({ title, description, type = 'website', canonicalPath, structuredData }: SeoMetaOptions) {
  useEffect(() => {
    const fullTitle = title.includes('Jameel Khan') ? title : `${title} | Jameel Khan`;
    document.title = fullTitle;
    const safeDesc = (description || 'Jameel Khan — Legal Research, Case Laws, Judgments & Academic Publications.').slice(0, 300);

    setMetaTag('name', 'description', safeDesc);
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', safeDesc);
    setMetaTag('property', 'og:type', type);
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', safeDesc);

    const canonicalUrl = window.location.origin + (canonicalPath || window.location.pathname);
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);
    setMetaTag('property', 'og:url', canonicalUrl);

    const existingScript = document.getElementById('dynamic-json-ld');
    if (existingScript) {
      existingScript.remove();
    }
    if (structuredData) {
      const script = document.createElement('script');
      script.id = 'dynamic-json-ld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        ...structuredData,
      });
      document.head.appendChild(script);
    }
  }, [title, description, type, canonicalPath, structuredData]);
}
