/* Sum-IT site config — editable without touching the site code.
   API_BASE: '' means same origin (Cloudflare Pages Functions under /api/*).
   socials: leave a URL empty ('') to HIDE that icon on the site.
   offer.promo: the promotion text on the homepage and /prijzen/ (js/promo.js),
     per language; simple HTML (<s>, <strong>) is allowed. promoActive: false
     hides it everywhere. The duration of the free period is not stated on
     purpose: it still has to be confirmed by the client.
   offer.limit / showRemaining: the old "X of 150 places left" counter. Keep it
     off: the client asked not to mention a first-customers limit.
   No display offsets: counters and queue positions show the real numbers. */
window.SITE_CFG = {
  API_BASE: 'https://sum-it-app.pages.dev',
  PORTAL_URL: '/portal.html',
  socials: {
    linkedin: 'https://www.linkedin.com/company/sum-it-eu/',
    instagram: 'https://www.instagram.com/sumit.eu/',
    x: 'https://x.com/SumITEurope'
  },
  offer: {
    limit: 150,
    showRemaining: false,
    promoActive: true,
    promo: {
      nl: 'Normaal <s>€11</s>, <strong>GRATIS</strong> als je je nu aanmeldt!',
      en: 'Normally <s>€11</s>, <strong>FREE</strong> if you sign up right now!'
    }
  },
  fallbackClaimed: 0,
  QUEUE_OFFSET: 0
};
