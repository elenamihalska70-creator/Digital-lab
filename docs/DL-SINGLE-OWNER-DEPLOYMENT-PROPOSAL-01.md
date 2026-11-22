# Single-owner controlled TEST deployment policy

Status: POLICY APPROVED by the Digital Lab owner under DL-SEC-DECISION-01 on 2026-11-22. DEPLOYMENT NOT AUTHORIZED OR ACTIVATED.
Prepared for DL-RELEASE-CANDIDATE-01, 22 November 2026.
Owner decision recorded: Single-Owner Controlled Deployment is approved, and the owner explicitly accepts the residual risk from the absence of an independent second reviewer. This supersedes the independent-reviewer requirement for Cloudflare TEST only. It does not approve any commit, push, merge, deployment, activation or infrastructure change. CLOUDFLARE_TEST_DEPLOY_ENABLED must remain false.

## Approved decision and scope

Permit the repository owner to provide the required cloudflare-test environment approval, including approval of a run that the owner initiated, instead of requiring a second independent person. This is the owner-approved single-owner exception for Cloudflare TEST preview only. It does not authorize production, FAILOVER, custom domains, DNS, OVH or Vercel changes.

The owner has explicitly accepted that the same person can author, merge, dispatch and approve code. A compromised owner account, mistaken review or malicious dependency can then pass the human approval gate without a second person's scrutiny. Checksums establish artifact identity; they do not establish that the code is safe. Pages Edit is account-scoped and a compromised token may affect other Pages projects in that account. Automated checks do not restore separation of duties.

## Technical controls to retain without weakening

- Protected main and a mandatory Pull Request; no direct pushes, force pushes or ruleset bypass. Require up-to-date pricing and verify checks and resolved review conversations.
- Review the exact source SHA, workflow diff, lockfiles, test evidence and dependency audit before dispatch. No deployment from feature branches or pull_request events.
- Manual workflow_dispatch only, with a full expected_sha matching the selected main SHA. Default deploy_test=false. Require a new explicit owner release authorization for each deployment run.
- Keep cloudflare-test restricted to the exact main branch, require owner environment approval and keep administrator bypass disabled. Do not remove the approval gate.
- Keep CLOUDFLARE_TEST_DEPLOY_ENABLED=false until credentials and destination are separately verified, a validation-only run passes, and a particular TEST publication and activation are separately authorized. Policy approval alone does not permit changing it. Changing this variable is a separate infrastructure action.
- Credential-free, read-only PR validation; pinned Actions; checkout without persisted credentials. No pull_request_target deployment. Keep the token as a protected environment secret, exposed only to the upload/preflight step. Use account-limited Pages Edit with a reviewed expiry; no DNS or Workers privileges.
- Retain all three builds and public/standby browser gates. Download only the same-run TEST archive; verify checksum, TEST mode, exact source SHA and run attempt before upload. Never upload FAILOVER automatically.
- Retain fixed project digital-lab-backup, preview branch ci-test, project/subdomain checks and production_branch != ci-test preflight. Keep that mapping stable during upload. Capture the root production deployment identity before and after the run.
- Retain TEST live-submission suppression, GA4 suppression, noindex/CSP checks, closed legacy API checks, post-upload identity and smoke verification. An upload with failed smoke is a failed release.
- Retain deployment concurrency controls, traceable run records and seven-day CI artifacts. Preserve a known-good TEST archive and checksum beyond CI expiry in approved private storage.

## Decision record and per-run evidence

DL-SEC-DECISION-01 was explicitly approved by the Digital Lab owner on 2026-11-22. The owner accepted the increased risk associated with having no independent second reviewer. This local documentation update records that decision. Environment approval remains mandatory and owner self-review is permitted under the exception; administrator bypass remains forbidden. No workflow or provider setting is changed. Any future environment reconciliation, activation or upload requires its own explicit authorization.

Before each authorized upload, record reviewed main SHA, validation run/attempt, artifact checksum, intended preview destination, current root deployment identity, rollback artifact and explicit owner publication approval. The environment approval must be an intentional action for that exact run; a green PR or approval of this document is insufficient.

An independent reviewer is no longer a blocking requirement for this approved TEST-only policy. Adding independent review remains a possible future strengthening. Leave deployment disabled until all remaining technical and per-run authorization gates are satisfied.

## Failure and rollback

A failed preflight must stop before upload. A successful upload followed by failed smoke requires stopping further dispatches, inspecting the run and performing only a separately authorized restoration of the known-good TEST artifact to ci-test. Verify restored identity, headers, inert submissions and unchanged root deployment. Do not promote FAILOVER, change DNS or retry an uncertain upload blindly. Vercel rollback remains a distinct production action requiring separate authorization and a recorded production deployment ID.
