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
    <link rel="icon" href="/favicon.svg?v=2" type="image/svg+xml" />
    <link rel="stylesheet" href="/global.css" />
  </head>
  <body>
    <header class="site-header">
      <nav class="site-nav" aria-label="Primary">
        <a class="brand" href="/principles">
          <svg class="brand-mark" viewBox="0 0 1254 1254" role="img" aria-label="Bitcoin">
            <path
              fill="#F7931A"
              d="M 573.500 0.807 C 575.150 1.078, 568.718 2.105, 559.207 3.089 C 374.516 22.210, 212.121 122.360, 107.761 281.500 C -6.392 455.572, -27.972 664.541, 48.575 854.600 C 114.130 1017.363, 255.751 1148.946, 427.262 1206.443 C 658.758 1284.049, 910.635 1221.945, 1082.517 1044.879 C 1219.655 903.604, 1278.818 695.455, 1237.532 499.500 C 1194.430 294.926, 1048.121 118.583, 859 43.265 C 805.157 21.821, 750.542 8.738, 686 1.822 C 675.914 0.741, 567.110 -0.240, 573.500 0.807"
            ></path>
            <path
              fill="#FFF"
              fill-rule="evenodd"
              d="M 511.758 250.750 L 511.500 312.500 439.250 312.757 L 367 313.013 367 357.443 L 367 401.873 398.750 402.187 C 429.647 402.492, 430.640 402.563, 435.727 404.863 C 441.840 407.627, 448.285 414.216, 451.339 420.824 L 453.500 425.500 453.113 612.986 C 452.900 716.103, 452.358 801.753, 451.908 803.320 C 450.507 808.204, 446.188 814.683, 441.866 818.382 C 434.584 824.616, 432.175 824.979, 397.250 825.105 L 366 825.217 366 870.609 L 366 916 438.500 916 C 506.866 916, 511.002 916.100, 511.038 917.750 C 511.059 918.712, 511.043 945.487, 511.001 977.250 L 510.926 1035 550.463 1035 L 590 1035 590 975.985 L 590 916.971 620.010 917.235 L 650.021 917.500 650.041 976.250 L 650.062 1035 690.531 1035 L 731 1035 731 976.151 L 731 917.301 747.750 916.619 C 789.011 914.939, 819.655 908.756, 844.562 897.084 C 902.008 870.164, 933 817.919, 933 748 C 933 670.634, 892.983 618.397, 819.354 599.649 C 812.559 597.919, 807 596.247, 807 595.934 C 807 595.621, 809.492 594.580, 812.537 593.620 C 830.067 588.094, 850.927 575.232, 864.520 561.567 C 882.265 543.730, 893.032 523.321, 899.176 495.881 C 902.270 482.062, 902.532 447.884, 899.653 433.536 C 885.256 361.759, 829.572 319.603, 742.250 314.373 L 731 313.699 731 251.350 L 731 189 691 189 L 651 189 651 251 L 651 313 621 313 L 591 313 591 251 L 591 189 551.508 189 L 512.015 189 511.758 250.750 M 591 482.072 L 591 561.143 642.750 560.735 C 690.536 560.358, 695.189 560.170, 703.500 558.270 C 739.156 550.118, 759.789 532.630, 768.185 503.443 C 771.222 492.885, 771.475 467.284, 768.644 457 C 763.131 436.975, 750.972 422.088, 732.504 412.754 C 714.588 403.698, 708.353 403.013, 643.750 403.006 L 591 403 591 482.072 M 591 736.496 L 591 827.190 648.750 826.718 C 715.790 826.170, 722.420 825.491, 743.698 816.992 C 779.844 802.556, 798.675 768.596, 794.210 725.900 C 790.210 687.644, 768.305 663.010, 728.990 652.553 C 708.673 647.149, 703.565 646.765, 645.250 646.266 L 591 645.801 591 736.496"
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
