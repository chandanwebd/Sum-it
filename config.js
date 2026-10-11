/* Sum-IT site config — editable without touching the site code.
   API_BASE: '' means same origin (Cloudflare Pages Functions under /api/*).
   socials: leave a URL empty ('') to HIDE that icon on the site.
   offer: the "first 150 users get three months free" promotion. The
     "X of 150 places left" counter stays hidden until showRemaining is true;
     switch it on only once it is confirmed that the API's real signup count
     ("claimed", see functions/api/stats/public.js) is what the 150 refers to.
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
    showRemaining: false
  },
  fallbackClaimed: 0,
  QUEUE_OFFSET: 0
};
