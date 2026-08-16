<?php
// Ports src/pages/admin/endorsements/[id].astro. Reached at
// /admin/endorsements/{id} via the rewrite in public/.htaccess (which maps
// it to this file with ?id=). Protected by Apache Basic Auth
// (public/php/admin/.htaccess).

require_once __DIR__ . '/../lib/db.php';
require_once __DIR__ . '/../lib/validation.php';
require_once __DIR__ . '/../lib/layout.php';

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
$sig = $id > 0 ? db_get_signature_by_id($id) : null;

if (!$sig) {
    header('Location: /admin/endorsements', true, 303);
    exit;
}

$selectedTypes = db_parse_participant_types($sig['participant_type']);
$updated = ($_GET['updated'] ?? '') === '1';
$hasError = ($_GET['error'] ?? '') === 'validation';

layout_open("Admin — Edit endorsement #{$sig['id']}", 'Edit an endorsement submission.');
?>
  <div class="reading-column">
    <p><a href="/admin/endorsements">&larr; Back to moderation queue</a></p>
    <h1>Edit endorsement #<?= (int) $sig['id'] ?></h1>
    <p class="ledger-meta">
      <?= h($sig['status']) ?> · v<?= h($sig['principles_version']) ?> · submitted <?= h($sig['created_at']) ?>
      <?= $sig['moderated_at'] ? ' · moderated ' . h($sig['moderated_at']) : '' ?>
    </p>

    <?php if ($updated): ?>
      <p class="form-success">Changes saved.</p>
    <?php endif; ?>
    <?php if ($hasError): ?>
      <p class="form-error">Please check the highlighted fields and try again.</p>
    <?php endif; ?>

    <form method="POST" action="/api/admin/edit" class="form-grid">
      <input type="hidden" name="id" value="<?= (int) $sig['id'] ?>" />

      <div class="form-field">
        <label for="name">Name or pseudonym</label>
        <input type="text" id="name" name="name" maxlength="100" required value="<?= h($sig['name']) ?>" />
      </div>

      <div class="form-field">
        <fieldset class="checkbox-group">
          <legend>Participant type <span class="hint">(select all that apply)</span></legend>
          <?php foreach (PARTICIPANT_TYPES as $t): ?>
            <label class="checkbox-option">
              <input type="checkbox" name="participant_type[]" value="<?= h($t) ?>" <?= in_array($t, $selectedTypes, true) ? 'checked' : '' ?> />
              <?= h($t) ?>
            </label>
          <?php endforeach; ?>
        </fieldset>
      </div>

      <div class="form-field">
        <label for="website">Website</label>
        <input type="text" id="website" name="website" maxlength="300" value="<?= h($sig['website'] ?? '') ?>" />
      </div>

      <div class="form-field">
        <label for="github">GitHub</label>
        <input type="text" id="github" name="github" maxlength="120" value="<?= h($sig['github'] ?? '') ?>" />
      </div>

      <div class="form-field">
        <label for="x_profile">X</label>
        <input type="text" id="x_profile" name="x_profile" maxlength="120" value="<?= h($sig['x_profile'] ?? '') ?>" />
      </div>

      <div class="form-field">
        <label for="nostr">Nostr</label>
        <input type="text" id="nostr" name="nostr" maxlength="120" value="<?= h($sig['nostr'] ?? '') ?>" />
      </div>

      <div class="form-field">
        <label for="comment">Comment</label>
        <textarea id="comment" name="comment" maxlength="280" rows="3"><?= h($sig['comment'] ?? '') ?></textarea>
      </div>

      <div>
        <button type="submit" class="btn btn-primary">Save changes</button>
      </div>
    </form>

    <h2>Status</h2>
    <div class="admin-actions">
      <form method="POST" action="/api/admin/moderate">
        <input type="hidden" name="id" value="<?= (int) $sig['id'] ?>" />
        <input type="hidden" name="status" value="approved" />
        <button type="submit" class="btn btn-primary" <?= $sig['status'] === 'approved' ? 'disabled' : '' ?>>Approve</button>
      </form>
      <form method="POST" action="/api/admin/moderate">
        <input type="hidden" name="id" value="<?= (int) $sig['id'] ?>" />
        <input type="hidden" name="status" value="rejected" />
        <button type="submit" class="btn btn-secondary" <?= $sig['status'] === 'rejected' ? 'disabled' : '' ?>>Reject</button>
      </form>
      <form method="POST" action="/api/admin/delete" data-confirm="Permanently delete this endorsement? This cannot be undone.">
        <input type="hidden" name="id" value="<?= (int) $sig['id'] ?>" />
        <button type="submit" class="btn btn-secondary">Delete permanently</button>
      </form>
    </div>
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
