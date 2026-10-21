// Read-only, human-evidence governance. No network, installs, policy execution or writes.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { canonical, digest, safeRead, json, packageRoot } from './contracts.mjs';
import { validateSchema } from './schema.mjs';

export const ledgerPath = '.agrimap-agent/reports/golden-lint/third-party.json';
const nonempty = v => typeof v === 'string' && v.trim().length > 0;
const sha = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
const secret = /(?:Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|secret|token)\s*[=:]\s*["']?[A-Za-z0-9+/_-]{8,})/i;
export function validateLedger(input) {
  const fail = () => { throw new Error('INVALID_GOVERNANCE'); };
  try { validateSchema(input, json(path.join(packageRoot, 'schemas/governance.schema.json')), path.join(packageRoot, 'schemas')); } catch { fail(); }
  if (canonical(input).length > 2_000_000 || secret.test(canonical(input))) fail();
  const heads = new Map(), assessments = new Map(), decisions = new Map();
  for (const a of input.assessments) {
    const { assessmentId, ...payload } = a;
    if (assessmentId !== digest(payload) || assessments.has(assessmentId) || a.previous !== (heads.get(a.subject)?.assessmentId || null)) fail();
    if (![a.subject, a.version, a.usage, a.reviewer, a.rationale, a.remediation].every(nonempty) || !date(a.checkedOn) || !date(a.reviewAfter) || a.reviewAfter < a.checkedOn) fail();
    if (a.outcome !== 'unknown' && !a.sources.length) fail();
    for (const s of a.sources) {
      let url; try { url = new URL(s.url); } catch { fail(); }
      if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !nonempty(s.clause) || !sha(s.contentDigest)) fail();
    }
    if (a.previous && a.checkedOn < assessments.get(a.previous).checkedOn) fail();
    heads.set(a.subject, a); assessments.set(assessmentId, a);
  }
  for (const d of input.decisions) {
    const { decisionId, ...payload } = d;
    if (decisionId !== digest(payload) || !assessments.has(d.assessmentId) || ![d.owner, d.reason, d.evidence].every(nonempty) || !date(d.decidedOn) || d.decidedOn < assessments.get(d.assessmentId).checkedOn || d.previous !== (decisions.get(d.assessmentId)?.decisionId || null)) fail();
    if (decisions.has(d.assessmentId) && d.decidedOn < decisions.get(d.assessmentId).decidedOn) fail();
    decisions.set(d.assessmentId, d);
  }
  for (const a of input.assessments) {
    const previous = assessments.get(a.previous);
    if (previous?.outcome === 'violation' && ['high', 'critical'].includes(previous.severity) &&
        (a.outcome !== 'violation' || !['high', 'critical'].includes(a.severity))) {
      const owner = decisions.get(previous.assessmentId);
      if (a.outcome !== 'compliant' || owner?.action !== 'fix' || owner.decidedOn > a.checkedOn || !nonempty(a.verification)) fail();
    }
  }
  if (!nonempty(input.inventory.reviewer) || !nonempty(input.inventory.evidence)) fail();
  return { heads, decisions };
}

export function evaluateGovernance(ledger, snapshotIdentity, asOf) {
  if (!date(asOf)) throw new Error('INVALID_GOVERNANCE_DATE');
  if (!ledger) return { schemaVersion: 1, status: 'needs-review', inputDigest: null, asOf, snapshotIdentity, ledger: null, items: [], diagnostics: ['THIRD_PARTY_NOT_ASSESSED'] };
  const { heads, decisions } = validateLedger(ledger);
  const stale = ledger.snapshotIdentity !== snapshotIdentity;
  const items = [...heads.values()].sort((a, b) => a.subject < b.subject ? -1 : a.subject > b.subject ? 1 : 0).map(a => {
    const d = decisions.get(a.assessmentId) || null;
    const severe = a.outcome === 'violation' && ['high', 'critical'].includes(a.severity);
    const freshness = stale || asOf > a.reviewAfter || asOf < a.checkedOn ? 'stale' : 'current';
    const decision = d && d.decidedOn <= asOf ? d : null;
    const status = severe ? !decision || decision.action === 'reopen' ? 'blocked-owner' : decision.action === 'decline' ? 'acknowledged-unresolved' : 'blocked-remediation'
      : freshness === 'stale' || a.outcome === 'unknown' ? 'needs-review' : a.outcome === 'violation' ? 'remediation-needed' : 'reviewed';
    return { subject: a.subject, assessmentId: a.assessmentId, status, freshness, decisionId: decision?.decisionId || null };
  });
  const blocked = items.some(i => ['blocked-owner', 'blocked-remediation', 'acknowledged-unresolved'].includes(i.status));
  const diagnostics = [...(stale ? ['GOVERNANCE_SNAPSHOT_CHANGED'] : []), ...(!ledger.inventory.complete ? ['THIRD_PARTY_INVENTORY_INCOMPLETE'] : [])];
  return { schemaVersion: 1, status: blocked ? 'blocked' : diagnostics.length || items.some(i => i.status !== 'reviewed') ? 'needs-review' : 'reviewed', inputDigest: digest(ledger), asOf, snapshotIdentity, ledger, items, diagnostics };
}

export function readGovernance(root, snapshotIdentity, asOf, immutable = false) {
  // A live private ledger cannot attest historical Git blobs.
  if (immutable) return evaluateGovernance(null, snapshotIdentity, asOf);
  const file = path.join(root, ledgerPath);
  const bytes = existsSync(file) ? safeRead(root, ledgerPath) : null;
  const result = evaluateGovernance(bytes ? JSON.parse(bytes.toString('utf8')) : null, snapshotIdentity, asOf);
  return result;
}

export function validateGovernance(result) {
  if (canonical(result) !== canonical(evaluateGovernance(result.ledger, result.snapshotIdentity, result.asOf))) throw new Error('INVALID_GOVERNANCE');
  return result;
}

export function validateGovernanceHistory(previous, next) {
  validateLedger(next);
  if (!previous) return;
  validateLedger(previous);
  for (const key of ['assessments', 'decisions']) {
    if (canonical(next[key].slice(0, previous[key].length)) !== canonical(previous[key])) throw new Error('GOVERNANCE_HISTORY_REWRITE');
  }
  if (previous.snapshotIdentity !== next.snapshotIdentity) {
    const { heads: oldHeads } = validateLedger(previous), { heads: newHeads } = validateLedger(next);
    if ([...oldHeads].some(([subject, a]) => newHeads.get(subject)?.assessmentId === a.assessmentId)) throw new Error('GOVERNANCE_REASSESSMENT_REQUIRED');
  }
}
