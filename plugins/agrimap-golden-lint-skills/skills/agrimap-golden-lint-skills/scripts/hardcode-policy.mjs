// Append-only owner decisions for hardcode points the team decided not to change.
// Read-only for scans: no network, no product writes, no ledger mutation here.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { canonical, digest, safeRead, json, packageRoot } from './contracts.mjs';
import { validateSchema } from './schema.mjs';

export const hardcodePolicyPath = '.agrimap-agent/reports/golden-lint/hardcode-policy.json';
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const secret = /(?:Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|secret|token)\s*[=:]\s*["']?[A-Za-z0-9+/_-]{8,})/i;

// One entry per decision, chained per subject, so a scan recalls it without rewriting history.
export function validateHardcodeLedger(input) {
  const fail = () => { throw new Error('INVALID_HARDCODE_POLICY'); };
  try { validateSchema(input, json(path.join(packageRoot, 'schemas/hardcode-policy.schema.json')), path.join(packageRoot, 'schemas')); } catch { fail(); }
  if (canonical(input).length > 2_000_000 || secret.test(canonical(input))) fail();
  const heads = new Map();
  for (const entry of input.entries) {
    const { entryId, ...payload } = entry;
    if (entryId !== digest(payload) || entry.previous !== (heads.get(entry.subjectKey)?.entryId ?? null)) fail();
    if (![entry.subjectKey, entry.class, entry.path, entry.valueMask, entry.owner, entry.reason].every(nonempty)) fail();
    if (!sha(entry.subjectKey) || !sha(entry.snapshotIdentity) || !date(entry.decidedOn) || !date(entry.reviewAfter) || entry.reviewAfter < entry.decidedOn) fail();
    if (!Array.isArray(entry.evidence) || !entry.evidence.length || !entry.evidence.every(nonempty)) fail();
    if (heads.has(entry.subjectKey) && entry.decidedOn < heads.get(entry.subjectKey).decidedOn) fail();
    heads.set(entry.subjectKey, entry);
  }
  return { heads };
}

// An acknowledgement stays valid until reviewAfter; after that the point is asked about again.
const stateOf = (head, asOf) => head.action === 'reopen' ? 'open' : asOf > head.reviewAfter ? 'expired' : 'acknowledged';
const itemOf = (head, asOf) => ({ entryId: head.entryId, subjectKey: head.subjectKey, class: head.class, tier: head.tier, path: head.path,
  valueMask: head.valueMask, owner: head.owner, reason: head.reason, decidedOn: head.decidedOn, reviewAfter: head.reviewAfter, state: stateOf(head, asOf) });

export function evaluateHardcodePolicy(ledger, asOf) {
  if (!date(asOf)) throw new Error('INVALID_HARDCODE_POLICY_DATE');
  if (!ledger) return { schemaVersion: 1, status: 'not-assessed', asOf, inputDigest: null, ledger: null, items: [], diagnostics: ['HARDCODE_POLICY_NOT_ASSESSED'] };
  const { heads } = validateHardcodeLedger(ledger);
  const items = [...heads.values()].map(head => itemOf(head, asOf)).sort((a, b) => a.subjectKey < b.subjectKey ? -1 : a.subjectKey > b.subjectKey ? 1 : 0);
  const expired = items.filter(item => item.state === 'expired');
  const diagnostics = expired.length ? ['HARDCODE_POLICY_EXPIRED'] : [];
  return { schemaVersion: 1, status: diagnostics.length ? 'needs-review' : 'reviewed', asOf, inputDigest: digest(ledger), ledger, items, diagnostics };
}

export function validateHardcodePolicyResult(result) {
  if (canonical(result) !== canonical(evaluateHardcodePolicy(result.ledger, result.asOf))) throw new Error('INVALID_HARDCODE_POLICY');
  return result;
}

// The ledger lives in local agent state, so an immutable Git snapshot has no ledger to attest.
export function readHardcodePolicy(root, asOf, immutable = false) {
  if (immutable) return evaluateHardcodePolicy(null, asOf);
  const bytes = existsSync(path.join(root, hardcodePolicyPath)) ? safeRead(root, hardcodePolicyPath) : null;
  return evaluateHardcodePolicy(bytes ? JSON.parse(bytes.toString('utf8')) : null, asOf);
}

export function acknowledgedSubjects(policy) {
  return new Map((policy?.items || []).filter(item => item.state === 'acknowledged').map(item => [item.subjectKey, item]));
}

// A recorded decision is the owner's answer for that exact subject; it is not a Golden verdict.
export function applyHardcodePolicy(findings, policy) {
  const acknowledged = acknowledgedSubjects(policy);
  if (!acknowledged.size) return findings;
  return findings.map(finding => {
    const item = finding.hardcode ? acknowledged.get(finding.hardcode.subjectKey) : null;
    if (!item) return finding;
    return { ...finding, disposition: 'accepted-exception',
      hardcode: { ...finding.hardcode, acknowledged: { entryId: item.entryId, owner: item.owner, reason: item.reason, decidedOn: item.decidedOn, reviewAfter: item.reviewAfter } } };
  });
}

export function validateHardcodePolicyHistory(previous, next) {
  validateHardcodeLedger(next);
  if (!previous) return;
  validateHardcodeLedger(previous);
  if (canonical(next.entries.slice(0, previous.entries.length)) !== canonical(previous.entries)) throw new Error('HARDCODE_POLICY_HISTORY_REWRITE');
}
