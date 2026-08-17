<?php
// Ports src/pages/admin/endorsements.astro. Reached at /admin via the
// rewrite in public/.htaccess. Protected by Apache Basic Auth
// (public/php/admin/.htaccess) — this file assumes it only runs for an
// already-authenticated request.

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/layout.php';

// SiteGround's front-end proxy caches GET responses by default — never
// cache the moderation queue (must always reflect live DB state, and it's
// behind Basic Auth, not meant to be shared across requests).
header('Cache-Control: no-store, no-cache, must-revalidate');

$pending = db_list_pending_signatures();
$recent = array_slice(db_list_all_signatures_for_admin(), 0, 40);

layout_open('Admin — Endorsements', 'Endorsement moderation queue.');
?>
  <div class="reading-column">
    <h1>Endorsement moderation</h1>

    <h2>Pending (<?= count($pending) ?>)</h2>
    <?php if (count($pending) === 0): ?>
      <p>Nothing waiting for review.</p>
    <?php endif; ?>
    <ul class="ledger-list">
      <?php foreach ($pending as $sig): ?>
        <li class="ledger-item">
          <div>
            <div class="ledger-name">
              <?= h($sig['name']) ?>
              <span class="ledger-types">
                <?php foreach (db_parse_participant_types($sig['participant_type']) as $t): ?>
                  <span class="ledger-type"><?= h($t) ?></span>
                <?php endforeach; ?>
              </span>
            </div>
            <div class="ledger-meta">
              v<?= h($sig['principles_version']) ?> · <?= h($sig['created_at']) ?>
              <?= $sig['website'] ? ' · ' . h($sig['website']) : '' ?>
              <?= $sig['github'] ? ' · ' . h($sig['github']) : '' ?>
              <?= $sig['x_profile'] ? ' · ' . h($sig['x_profile']) : '' ?>
              <?= $sig['nostr'] ? ' · ' . h($sig['nostr']) : '' ?>
            </div>
            <?php if ($sig['comment']): ?>
              <div class="ledger-comment"><?= h($sig['comment']) ?></div>
            <?php endif; ?>
          </div>
          <div class="admin-actions">
            <a href="/admin/<?= (int) $sig['id'] ?>" class="btn btn-secondary">Edit</a>
            <form method="POST" action="/api/admin/moderate">
              <input type="hidden" name="id" value="<?= (int) $sig['id'] ?>" />
              <input type="hidden" name="status" value="approved" />
              <button type="submit" class="btn btn-primary">Approve</button>
            </form>
            <form method="POST" action="/api/admin/moderate">
              <input type="hidden" name="id" value="<?= (int) $sig['id'] ?>" />
              <input type="hidden" name="status" value="rejected" />
              <button type="submit" class="btn btn-secondary">Reject</button>
            </form>
            <form method="POST" action="/api/admin/delete" data-confirm="Permanently delete this endorsement? This cannot be undone.">
              <input type="hidden" name="id" value="<?= (int) $sig['id'] ?>" />
              <button type="submit" class="btn btn-secondary">Delete</button>
            </form>
          </div>
        </li>
      <?php endforeach; ?>
    </ul>

    <h2>Recent (all statuses)</h2>
    <ul class="ledger-list">
      <?php foreach ($recent as $sig): ?>
        <li class="ledger-item">
          <div>
            <div class="ledger-name"><?= h($sig['name']) ?></div>
            <div class="ledger-meta">
              <?= h($sig['status']) ?> · v<?= h($sig['principles_version']) ?> · <?= h($sig['created_at']) ?>
            </div>
          </div>
          <div class="admin-actions">
            <span class="ledger-types">
              <?php foreach (db_parse_participant_types($sig['participant_type']) as $t): ?>
                <span class="ledger-type"><?= h($t) ?></span>
              <?php endforeach; ?>
            </span>
            <a href="/admin/<?= (int) $sig['id'] ?>" class="btn btn-secondary">Edit</a>
          </div>
        </li>
      <?php endforeach; ?>
    </ul>
  </div>

  <script>
    document.querySelectorAll('form[data-confirm]').forEach((form) => {
      form.addEventListener('submit', (event) => {
        if (!confirm(form.dataset.confirm ?? 'Are you sure?')) event.preventDefault();
      });
    });
  </script>

  <style>
    .admin-actions {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }
  </style>
<?php
layout_close();
