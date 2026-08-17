// Shared client-side renderer for the approved-signatures ledger, used by
// both src/pages/endorsements.astro and
// src/components/PrinciplesDocument.astro's inline endorsements widget.
// Both used to render this server-side directly from the DB; now that the
// site is static output, they fetch /api/endorsements (public/php/endorsements.php)
// and render it here instead. Runs in the browser only.

export interface LedgerSignature {
  name: string;
  participantTypes: string[];
  website: string | null;
  github: string | null;
  xProfile: string | null;
  comment: string | null;
  principlesVersion: string;
  date: string;
  isFoundingSignatory: boolean;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function renderLedgerList(sig: LedgerSignature): string {
  const links = [
    sig.website && `<a href="${escapeHtml(sig.website)}" rel="noopener nofollow">website</a>`,
    sig.github && `<a href="${escapeHtml(sig.github)}" rel="noopener nofollow">GitHub</a>`,
    sig.xProfile && `<a href="${escapeHtml(sig.xProfile)}" rel="noopener nofollow">X</a>`,
  ].filter(Boolean);

  return `
    <li class="ledger-item">
      <div>
        <div class="ledger-name">
          ${escapeHtml(sig.name)}
          ${sig.isFoundingSignatory ? '<span class="founding-badge">Founding Signatory</span>' : ''}
        </div>
        <div class="ledger-meta">
          v${escapeHtml(sig.principlesVersion)} · ${formatDate(sig.date)}
          ${links.length ? ' · ' + links.join(' · ') : ''}
        </div>
        ${sig.comment ? `<div class="ledger-comment">&ldquo;${escapeHtml(sig.comment)}&rdquo;</div>` : ''}
      </div>
      <span class="ledger-types">
        ${sig.participantTypes.map((t) => `<span class="ledger-type">${escapeHtml(t)}</span>`).join('')}
      </span>
    </li>
  `;
}

/** Fetches /api/endorsements and renders into the given list + summary elements. */
export async function loadLedger(
  listEl: HTMLElement,
  onLoaded: (total: number, signatures: LedgerSignature[]) => void
): Promise<void> {
  try {
    const res = await fetch('/api/endorsements');
    if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
    const data: { total: number; signatures: LedgerSignature[] } = await res.json();
    listEl.innerHTML = data.signatures.map(renderLedgerList).join('');
    onLoaded(data.total, data.signatures);
  } catch (err) {
    console.error('[endorsements] failed to load:', err);
    listEl.innerHTML = '<li class="ledger-item">Couldn’t load endorsements right now.</li>';
  }
}
