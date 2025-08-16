import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://tsvstock.com/sitemap.xml',
    host: 'https://tsvstock.com',
  };
}
