<?php
// Manual port of src/layouts/BaseLayout.astro + Nav.astro + Footer.astro.
// Not a shared template — Astro components can't run inside PHP. If the
// site chrome changes there, mirror the change here too. Kept to exactly
// the 3 PHP-rendered pages (endorsements.php, admin/endorsements.php,
// admin/edit.php); everything else is static Astro output.

function h(?string $s): string {
    return htmlspecialchars($s ?? '', ENT_QUOTES, 'UTF-8');
}

function layout_open(string $title, string $description, ?string $current = null): void {
    $config = require __DIR__ . '/config.php';
    $siteUrl = rtrim($config['site_url'] ?? 'https://bitcoinis.money', '/');
    $canonical = $siteUrl . ($_SERVER['REQUEST_URI'] ?? '/');
    ?>
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#14171c" />
    <title><?= h($title) ?> · BitcoinIs.Money</title>
    <meta name="description" content="<?= h($description) ?>" />
    <link rel="canonical" href="<?= h($canonical) ?>" />
    <meta property="og:title" content="<?= h($title) ?>" />
    <meta property="og:description" content="<?= h($description) ?>" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="<?= h($canonical) ?>" />
    <meta name="twitter:card" content="summary" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/global.css" />
  </head>
  <body>
    <header class="site-header">
      <nav class="site-nav" aria-label="Primary">
        <a class="brand" href="/principles">
          <svg class="brand-mark" viewBox="0 0 64 64" role="img" aria-label="Bitcoin">
            <path
              fill="#F7931A"
              d="m63.033,39.744c-4.274,17.143-21.637,27.576-38.782,23.301-17.138-4.274-27.571-21.638-23.295-38.78,4.272-17.145,21.635-27.579,38.775-23.305,17.144,4.274,27.576,21.64,23.302,38.784z"
            ></path>
            <path
              fill="#FFF"
              d="m46.103,27.444c0.637-4.258-2.605-6.547-7.038-8.074l1.438-5.768-3.511-0.875-1.4,5.616c-0.923-0.23-1.871-0.447-2.813-0.662l1.41-5.653-3.509-0.875-1.439,5.766c-0.764-0.174-1.514-0.346-2.242-0.527l0.004-0.018-4.842-1.209-0.934,3.75s2.605,0.597,2.55,0.634c1.422,0.355,1.679,1.296,1.636,2.042l-1.638,6.571c0.098,0.025,0.225,0.061,0.365,0.117-0.117-0.029-0.242-0.061-0.371-0.092l-2.296,9.205c-0.174,0.432-0.615,1.08-1.609,0.834,0.035,0.051-2.552-0.637-2.552-0.637l-1.743,4.019,4.569,1.139c0.85,0.213,1.683,0.436,2.503,0.646l-1.453,5.834,3.507,0.875,1.439-5.772c0.958,0.26,1.888,0.5,2.798,0.726l-1.434,5.745,3.511,0.875,1.453-5.823c5.987,1.133,10.489,0.676,12.384-4.739,1.527-4.36-0.076-6.875-3.226-8.515,2.294-0.529,4.022-2.038,4.483-5.155zm-8.022,11.249c-1.085,4.36-8.426,2.003-10.806,1.412l1.928-7.729c2.38,0.594,10.012,1.77,8.878,6.317zm1.086-11.312c-0.99,3.966-7.1,1.951-9.082,1.457l1.748-7.01c1.982,0.494,8.365,1.416,7.334,5.553z"
            ></path>
          </svg>
          <span>BitcoinIs.Money</span>
        </a>
        <ul class="nav-links">
          <li><a href="/principles" <?= $current === 'principles' ? 'aria-current="page"' : '' ?>>Principles</a></li>
          <li><a href="/predictions" <?= $current === 'predictions' ? 'aria-current="page"' : '' ?>>Predictions</a></li>
          <li><a href="/whitepaper" <?= $current === 'whitepaper' ? 'aria-current="page"' : '' ?>>White Paper</a></li>
          <li><a class="nav-cta" href="/endorse" <?= $current === 'endorse' ? 'aria-current="page"' : '' ?>>Endorse</a></li>
        </ul>
      </nav>
    </header>
    <main>
    <?php
}

function layout_close(): void {
    ?>
    </main>
    <footer class="site-footer">
      <div class="footer-inner">
        <p>BitcoinIs.Money</p>
        <ul class="footer-links">
          <li><a href="/principles">Principles</a></li>
          <li><a href="/predictions">Predictions</a></li>
          <li><a href="/whitepaper">White Paper</a></li>
        </ul>
      </div>
      <div class="footer-support">
        <a class="btn btn-support" href="/support">Support</a>
      </div>
    </footer>
  </body>
</html>
    <?php
}
