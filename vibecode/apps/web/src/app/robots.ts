import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin-panel/', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://oneshotcoding.io/sitemap.xml',
  };
}
