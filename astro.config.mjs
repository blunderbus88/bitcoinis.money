import { defineConfig } from 'astro/config';

// Static output: this site's only genuinely dynamic behavior (signature
// submission + admin moderation) is served by public/php/*.php instead —
// SiteGround (this site's host) doesn't offer Node hosting on this plan.
// See deploy/SITEGROUND_DEPLOY.md.
export default defineConfig({
  output: 'static',
  server: {
    port: 4321,
  },
});
