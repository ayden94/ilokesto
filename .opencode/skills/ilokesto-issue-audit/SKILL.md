---
name: ilokesto-issue-audit
description: Use when running `/search-issue`. Captures purpose routing, label allowlist, finding schema, and issue draft constraints for the ilokesto monorepo.
compatibility: opencode
metadata:
  language: en
  domain: audit
  mode: knowledge
---

# ilokesto Issue Audit

This skill provides the knowledge required for performing structured package audits within the ilokesto monorepo via `/search-issue`.

## Purpose Routing

`/search-issue` treats selected purposes as routing keys, not prompt hints.

| Purpose | Reviewer(s) | Output |
|---|---|---|
| `bug` | `ilokesto-code-reviewer`, `ilokesto-verification-reviewer` | `audit_finding` |
| `contract-api` | `ilokesto-contract-reviewer` | `audit_finding` |
| `architecture` | `ilokesto-contract-reviewer` | `audit_finding` |
| `tests-edge` | `ilokesto-verification-reviewer` | `audit_finding` |
| `docs` | `ilokesto-docs-release-reviewer` | `audit_finding` |
| `release-impact` | `ilokesto-docs-release-reviewer` | `audit_finding` |
| `feature-rd` | `ilokesto-contract-reviewer` | `rd_brief` |
| `comprehensive` | `contract-reviewer` + `code-reviewer` + `verification-reviewer` | `audit_finding` |

Reviewers audit only their assigned single package.

## Label Allowlist (Strict)

Only the following labels should be used when drafting or creating issues:

- **priority**: `priority:p0`, `priority:p1`, `priority:p2`
- **type**: `bug`, `enhancement`, `documentation`, `performance`, `tech-debt`
- **package**: `package:store`, `package:state`, `package:form`, `package:overlay`, `package:modal`, `package:toast`, `package:fetcher`, `package:utilinent`
- **source**: `source:search-issue` (Required for all audit findings)

## Finding Schema

Audit findings must include:

- `severity`: P0 (Critical), P1 (High), P2 (Medium)
- `package`: Package directory name
- `evidence`: File path and line number(s)
- `problem`: Concise description of the issue
- `contract_impact`: `none`, `doc-only`, `behavior-change`, or `breaking`
- `affected_surfaces`: Classification of required updates across `package`, `docs`, and `examples`
- `purpose_alignment`: `primary`, `secondary`, or `unrelated-critical`
- `preserve_contract_fix`: Contract-preserving fix direction
- `contract_change_needed`: Whether a contract change is needed and why

Feature R&D routes return `rd_brief` records:

- `package`: Package directory name
- `purpose`: `feature-rd`
- `user_problem`: User or developer problem the feature would solve
- `evidence_basis`: README/docs/current limitation/open issue evidence
- `current_surface`: Current API/docs behavior
- `recommended_option`: Minimal viable direction
- `contract_impact`: `none`, `doc-only`, `behavior-change`, or `breaking`
- `tests_docs_release_plan`: Required tests, docs, examples, and changeset assessment
- `issue_eligibility`: `candidate`, `defer`, or `reject`
- `anti_speculation_reason`: Required when eligibility is `defer` or `reject`

## Issue Draft Constraints

- **Unit of Issue**: Default to one issue per package.
- **Cross-Package Issues**: Only allowed if the root cause and fix theme are identical across multiple packages.
- **R&D Escalation**: `rd_brief` outputs become issue drafts only after documented gap evidence and must still pass registration triage. Speculative enhancements stay deferred.
- **Registration Triage**: `/search-issue` must send draft issues through `ilokesto-issue-registration-reviewer` before any GitHub issue creation.
- **No Unsafe Registration**: Duplicates, security-sensitive reports, support/usage questions, low-confidence P2 findings, speculative feature ideas, and label mismatches must be `defer` or `reject` instead of registered.