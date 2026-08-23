const ISSUE_BRANCH = /^issue-([1-9]\d*)-([a-z0-9]+(?:-[a-z0-9]+)*)$/u;
const POSITIVE_DECIMAL = /^[1-9]\d*$/u;
const MAX_SAFE_INTEGER_TEXT = String(Number.MAX_SAFE_INTEGER);

export function isPositiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

export function parsePositiveSafeInteger(value) {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL.test(value)) return null;
  if (value.length > MAX_SAFE_INTEGER_TEXT.length
    || (value.length === MAX_SAFE_INTEGER_TEXT.length && value > MAX_SAFE_INTEGER_TEXT)) return null;
  return Number(value);
}

export function parseIssueBranch(value, expectedIssueNumber) {
  const match = typeof value === 'string' ? ISSUE_BRANCH.exec(value) : null;
  if (match === null) return null;
  const issueText = match[1];
  const issueNumber = parsePositiveSafeInteger(issueText);
  if (issueNumber === null) return null;
  if (expectedIssueNumber !== undefined
    && (!isPositiveSafeInteger(expectedIssueNumber) || String(expectedIssueNumber) !== issueText)) return null;
  return Object.freeze({ branch: value, issueNumber, slug: match[2] });
}

export function parseIssueBranchRef(value, expectedIssueNumber) {
  if (typeof value !== 'string' || !value.startsWith('refs/heads/')) return null;
  return parseIssueBranch(value.slice('refs/heads/'.length), expectedIssueNumber);
}

export function parseIssueWorktree(value, expectedIssueNumber) {
  if (typeof value !== 'string' || !value.startsWith('.worktrees/')) return null;
  return parseIssueBranch(value.slice('.worktrees/'.length), expectedIssueNumber);
}
