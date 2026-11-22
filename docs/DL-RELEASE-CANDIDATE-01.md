# DL-RELEASE-CANDIDATE-01

Prepared locally on 22 November 2026. No commit, push, merge, deploy, secret access or infrastructure change is authorized or performed.

## Source and scope

- Expected and live remote base: feat/dl-ci-coverage-01, 0dffb2a3278bd32459cc22fe4d384616e47de0e6.
- Expected and live remote main: 9d153db5b2468d91067a87027452e7399da38ba5.
- Candidate branch: feat/dl-release-candidate-01.
- Candidate worktree: C:/Users/Lenovo/Projets/DigitalLab-release-candidate-01.
- HEAD stays at the base because no commit is authorized. The candidate is the base plus the reviewable local diff; it does not have a new commit SHA.
- PR #19 already includes #10-18. No parent commits are duplicated. Growth Tracking #9 and unrelated #2 are excluded.
- Production change: only src/components/AILabCarousel.jsx, 5000 to 3750 ms (25% shorter). ServiceGallery, CSS transitions, content, API, workflows and deployment configuration remain unchanged.
- Documentation corrects the CI PR base filter to main and feat/** and records the owner-approved TEST-only single-owner policy without activating deployment. scripts/check-carousel-ui.mjs provides the scoped local browser regression.

## CI eligibility

VERIFIED from unchanged workflow contents and the local trigger matrix: pricing runs on push and pull_request; verify runs for pull_request bases main or feat/**. An integration PR from this branch to main selects both required jobs; a feature push by itself selects pricing only. The source branch name does not replace the PR base filter. PR validation is credential-free and cannot deploy. The script is run locally with node scripts/check-carousel-ui.mjs after all three builds; adding it to hosted CI is not part of this candidate.

UNKNOWN: hosted checks for this candidate, since it is neither committed nor pushed and no PR has been created. The green checks previously observed for PR #19 are base evidence, not candidate evidence. New checks on the eventual committed candidate and its current main comparison remain mandatory.

## Privacy and provider decisions requiring owner approval

No factual disclosure or publication date is changed. PRIVACY_POLICY_LAST_UPDATED remains 2026-11-17. A passing check:privacy-date establishes only a valid non-future date different from the old notice, not the actual day of publication. The owner must confirm the actual publication day at release and authorize the corresponding code and browser-assertion update then.

The existing docs/DL-PRIVACY-CONSENT-01.md release gates remain open unless independently closed with evidence:

- Decide the remaining legal/factual position on security and correspondence legal bases, transfers, retention criteria and the proposed manual deletion process. The retention procedure is not an operational automatic deletion system. This report supplies no legal sign-off.
- Confirm account-level Vercel/Supabase DPAs, log retention, Gmail recipient/role and routing uncertainty, and any remaining historical Resend data processing. Previously reported provider facts are historical documentation, not newly reverified account settings.
- For Systeme.io, confirm account-specific DPA/roles, subprocessors, locations and safeguards; retention/deletion for requests, contacts and transactional email; live funnel cookies/scripts before and after choice; UTM persistence/contact association and appropriate disclosure/consent. Do not treat an audit request as marketing consent.
- Decide whether to keep the English links to the French notice, any optional cookie-lifetime changes, and the applicable hosting plan/commercial-use suitability. Do not silently change these policies.
- After any separately authorized release, verify the actual linked notice, consent-first GA4, zero Clarity requests and FR/EN responsive controls. Synthetic intercepted browser checks do not prove real vendor delivery or account settings.

## Approved deployment security policy

DL-SEC-DECISION-01: on 2026-11-22, the Digital Lab owner explicitly approved Single-Owner Controlled Deployment and accepted the residual risk from the absence of an independent second reviewer. See DL-SINGLE-OWNER-DEPLOYMENT-PROPOSAL-01.md (filename retained; status now approved). Owner environment approval, including self-review, replaces the independent-reviewer requirement for Cloudflare TEST only. This closes the policy-decision blocker; it does not authorize deployment. Protected main, a mandatory Pull Request, required pricing/verify, exact SHA, manual dispatch, environment approval, fixed ci-test, TEST/FAILOVER isolation, checksums, smoke tests, rollback and no administrator bypass remain mandatory. No workflow, credential, provider setting or infrastructure change is made. CLOUDFLARE_TEST_DEPLOY_ENABLED must remain false; activation and each actual upload still need separate explicit authorization.

## Vercel read-only findings and rollback requirements

VERIFIED through authenticated read-only Vercel tools: project digital-lab, prj_VigIo8kB5OPJWwBlXmMJ50xgUnIf, team_Gi8fOTjrmEOmqBkiyT3L5vZI. www.digitallab.studio resolves in Vercel metadata to READY production deployment dpl_GSChL6vjEUou9JGwSi3mZCY7bhyN, source git, branch main, SHA 9d153db5b2468d91067a87027452e7399da38ba5. It is listed as a rollback candidate. Earlier production deployments also identify main Git commits. Preview protection is reported as SSO for all_except_custom_domains.

INFERRED: a future main merge can initiate production deployment through the existing integration. The exact current auto-deploy/auto-assignment, approval and deployment-check settings are UNKNOWN because the connected project response does not expose them. Verify them before granting merge authorization. vercel.json alone cannot prove those controls.

Before release, re-read the production alias and record its exact deployment ID, SHA and availability. Retain the known-good deployment and confirm rollback permissions/eligibility and the effect on automatic domain assignment. Rollback is a separate owner-authorized production action; no rollback command was executed. A source revert must use a reviewed PR and tests, avoiding a blind full-stack revert that restores prior tracking behavior.

For Cloudflare TEST, capture the current root deployment identity and production_branch mapping before any upload; confirm ci-test is preview-only and account usage/token scope are suitable. Preserve a known-good TEST archive/checksum beyond the seven-day CI retention period. On failed smoke after upload, stop; inspect identity and logs and use only a separately authorized restore to ci-test. Do not promote FAILOVER or change DNS.

## Recommended release sequence

1. Review this uncommitted local diff, evidence and remaining owner decisions. Authorize any additional factual changes explicitly. Keep all provider activation disabled.
2. Resolve the publication-date/disclosure gates. The single-owner policy decision is approved under DL-SEC-DECISION-01; verify owner environment approval and all technical protections without administrator bypass. Do not infer activation or deployment approval from that decision.
3. Only after separate authorization, commit the reviewed candidate and push/open one integration PR against current remote main. Keep PR #9 and #2 out; do not merge parent patches twice. Record the new full SHA.
4. Require fresh dependency audit, local regression evidence, and successful pricing/verify on the exact candidate and current main comparison. Review the aggregate diff and Vercel production policy before a separately authorized merge. A sequential merge beginning with #10 is blocked by its missing required verify check; the aggregate PR includes the workflow without weakening protection.
5. After separately authorized integration, run validation-only workflow_dispatch on exact protected main with deploy_test=false and verify immutable artifact identities. A merge can affect Vercel, so it is a production action, not a harmless preparation step.
6. Only after all environment/policy/destination gates and separate publication authorization, consider setting activation true in its own infrastructure LOT and approving a TEST-only run. Verify the root identity is unchanged and all live smoke checks pass. FAILOVER and DNS remain separate decisions.

## Local evidence

Logs, audit JSON, trigger matrix, screenshots, per-file output manifests, source fingerprints and separately checksummed TEST/FAILOVER archives are under validation.local/ (ignored, local-only). Local archive markers explicitly label source_state=uncommitted-local-candidate, base_commit, source_sha256 and build_id. Their commit field denotes the base for compatibility with the existing validator; it must not be mistaken for a committed candidate or deployable production identity. No local artifact is uploaded.

The final validation and preservation results are recorded below after completion.

## Completed local validation

| Gate | Result |
| --- | --- |
| Fresh npm audit, full application | PASS: 0 findings |
| Fresh npm audit --omit=dev | PASS: 0 findings |
| Fresh Wrangler lockfile audit | PASS: 0 findings |
| npm test | PASS: 116/116 |
| npm run check:release (includes pricing) | PASS |
| npm run check:privacy-date | PASS for existing 2026-11-17 only; actual publication remains an owner gate |
| Normal / TEST / FAILOVER builds | PASS: 14 prerendered routes per build |
| npm run check:pricing:ui | PASS: pricing, repair, packages, consent |
| Audit funnel / retired portal browser suites | PASS |
| Cloudflare local isolation/routing suite | PASS: TEST/FAILOVER at 1440/390; canonical/reload, inactive actions, retired/API routes and hostname activation |
| Video suite | PASS: all 7 active clips/posters, desktop/mobile, all 3 builds; FR/EN hover behavior |
| New carousel suite | PASS: 18/18 (3 builds x FR/EN x 1440/390/320), 3750ms boundary, navigation, hover/focus, pause/resume, reduced motion, decoded images, layout and transition completion |
| CI trigger/guard matrix | PASS static verification; hosted candidate checks UNKNOWN |
| Artifact identity/isolation | PASS: separate modes, source fingerprints, SHA256, byte-equivalent extraction, wrong-mode rejection |
| Optimized media integrity | PASS: 9 MP4 source hashes match each of the 3 builds |
| git diff --check | PASS |

Vite emits its existing large-chunk warning. The earlier candidate preparation did not rerun full lint or the inherited header threshold check; DL-RELEASE-FINAL-GATES-01 results below supersede that limitation. Browser coverage is local Chromium and emulated mobile widths, not physical Safari or live edge behavior.

The new test harness was corrected during development for React commit scheduling, real CSS compositor timing, the existing global 0.01ms reduced-motion rule and a clock pause race. The final complete matrix passed. No additional production-code or CSS repair was made.

Final source build ID: local-rc-5e4c15db1c4072af.
Source fingerprint: 5e4c15db1c4072af570788d6ec46bafa4d0c03de6b914d8ce878a7ade33ceefe.

| Local artifact | Files | Archive SHA256 |
| --- | --- | --- |
| TEST-local-rc-5e4c15db1c4072af.tar.gz | 145 | 21f38d8af6c45179394c01028c3b8e54a3784412d7434ecd6478d6cc48ac6e7a |
| FAILOVER-local-rc-5e4c15db1c4072af.tar.gz | 145 | 4dcbc99ef6e1eb5c2a0470d13004d0149f6cc34f082478db5faaef5773021f6b |

Normal output contains 135 files; its per-file manifest is retained locally. All archives are local review evidence, not authorized deployment inputs. Documentation is outside the build-source fingerprint and can be reviewed in candidate.diff.

## Preservation and final reference check

VERIFIED after validation: all 18 pre-existing worktrees retained identical HEADs, branch names, Git statuses, index entries and SHA256 fingerprints for 3,469 tracked/non-ignored paths. This includes the original dirty main and the earlier carousel worktree. Ignored dependency/build directories were not part of the preservation snapshot. Evidence: validation.local/worktree-preservation.json.

The final live remote check still returned the two expected SHA values above. Candidate HEAD remains 0dffb2a3278bd32459cc22fe4d384616e47de0e6, with an empty index and five changed/new review files. There are zero commits beyond PR #19. The complete patch, including new files, is validation.local/candidate.diff. No existing worktree was edited and no provider setting or activation value was changed.

## DL-RELEASE-FINAL-GATES-01 / DL-SEC-DECISION-01

Review date: 2026-11-22. Scope: read-only review/local validation, with the explicit exception authorizing policy documentation updates in this file, DL-DUAL-HOSTING-CI-CD-01.md and DL-SINGLE-OWNER-DEPLOYMENT-PROPOSAL-01.md. No source, test, workflow or provider setting is changed in this final-gates turn. Policy approval closes the independent-reviewer decision only; it does not approve activation or deployment.

### Owner decision table

Evidence labels: V = verified in the repository during this review; H = historical owner/provider evidence recorded in docs/DL-PRIVACY-CONSENT-01.md, not a new account inspection; U = unknown live behavior. The blocking assessment follows the repository's release gates, not a legal certification.

| Provider | Actual data / scope established | Purpose | Existing evidence | Missing evidence / owner decision | Proposed correction or closure | Blocks production? |
| --- | --- | --- | --- | --- | --- | --- |
| Systeme.io / ITACWT | Email and website URL, contacts and confirmation/notification emails: H. Technical data, cookies and UTM/contact persistence: U. V code appends only fixed campaign values and an allowlisted placement key, not typed form data. | Audit requests and manual follow-up; not marketing consent. | V external link builder and consent-gated click events; H owner funnel inspection; notice sections 2/4 name the provider and data. | Account DPA, subprocessors/locations/transfers; actual cookies/scripts before/after choice; UTM association; retention/deletion for requests, contacts and transactional emails. | Record account evidence and a live read-only flow inventory; align notice/consent with what is observed. Do not invent marketing opt-in. | Yes: material existing funnel gates remain open. |
| Vercel | HTTP connection/request metadata (IP, URL): declared in notice. Earlier read-only deployment evidence links production to main. Account log content/retention: U. | Host public site and serve assets. | V notice and vercel.json; H authenticated production identity from the candidate-preparation turn. | Account DPA applicability, log retention, plan/commercial-use suitability; actual automatic production assignment/approval controls. | Confirm settings/terms without secrets; correct disclosures only if evidence differs. Record rollback target and permissions before merge. | Yes: material provider/release-policy gates remain open. |
| Supabase | Retained legacy emails/auth profiles/roles, requests, messages, documents, quotes/refusal comments: source model and notice. Live contents/counts not inspected. Candidate public build does not initialize the client; loopback dev recovery is gated. | Retain existing client records, access/security and contractual follow-up. | V service modules and portal/auth gates; H Ireland project region; public retirement notice. | Account DPA and access/transfer scope; owner retention/manual erasure process; whether direct Auth sign-up remains possible after frontend retirement. | Confirm legacy processing and applicable safeguards; adopt a truthful retention/erasure process separately. Do not imply portal retirement deleted data or disabled backend registration. | Yes for material unresolved disclosures/retention. Server sign-up is a separate server-side gate, not evidence of an active public UI. |
| OVHcloud + Google Gmail | Correspondence, sender details, message content and attachments; H OVH mailbox and one message delivered to Gmail. Exact routing, extent of copying and Gmail account type: U. | Receive and handle business enquiries. | V mailto/contact flow and cautious Gmail-recipient wording; H Zimbra/POP checks and message headers. | Routing mechanism/actual recipients; consumer vs Workspace role/terms; applicable DPA/transfers and retention/deletion. | Inventory the real route and account role; retain cautious wording until proven and align deletion across both mail stores. | Yes where the unresolved facts affect recipient/transfer/retention disclosures. |
| Google Analytics | Consented page/location/device and enumerated interaction data; no typed repair/contact fields are included by application code. Actual Google delivery not inspected. | Optional audience measurement. | V consent/credential guards and Clarity suppression; H owner-confirmed GA retention, Signals/Ads and processing terms. | Production acceptance after authorized deploy; final consistency of the notice with the accepted processing position. Previously closed GA account checks are not reopened here. | Keep opt-in and credential guards; perform planned live acceptance. Exact retention wording or shorter cookie lifetime is an optional separate owner decision. | No new account-configuration blocker established; live consent acceptance remains a mandatory release stage. |
| Resend / Microsoft Clarity | No current candidate sender path: legacy email handlers return 410. Clarity is disabled globally. Historical retained mail/recordings: U. | Historical email delivery / session recording only. | V 410 handlers and CLARITY_ENABLED=false; H prior provider use. | Whether historical records remain and need retention/recipient handling. | Record historical-data disposition; do not restore sending/recording or invent current provider processing. | Conditional on material retained data; no new active integration blocker found. |
| Google Drive / Sheets | Selected content/media and Content Hub access are declared in notice; no private automation flow or actual personal data was verified in this repository. | Internal content planning/publication. | V notice sections 5-7, explicitly limited selected-file access. | Whether the current internal automation and downstream providers actually match those declarations. | Owner confirms the factual scope; amend the notice only on evidence. No account or automation changes here. | Conditional if the declared processing is materially inaccurate. |
| Cloudflare | No new deployment by this candidate. Future hosted TEST would process ordinary HTTP metadata; TEST actions remain inert. | Optional standby preview; production FAILOVER is separately gated. | V isolated artifacts and fixed ci-test workflow; previous live settings are not re-read with credentials. | Root identity, production-branch mapping, account scope/capacity and applicable terms before a separately authorized upload. | Keep activation false; verify destination and provider role before TEST. Reassess production hosting disclosures before any FAILOVER. | Blocks TEST activation until verified; does not itself authorize production failover. |

Cross-provider blockers: actual privacy publication date remains unconfirmed (code still 2026-11-17); owner must settle remaining material legal-basis/transfer/retention facts, with legal review as needed. Optional English translation, exact GA retention wording and shorter cookie lifetime must not be confused with established mandatory blockers. No factual publication date is invented or changed.

### Systeme.io: repository proof versus assumptions

VERIFIED: src/config/auditFunnel.js constructs https://a59f-contact.systeme.io/audit-gratuit with fixed utm_source=digitallab, utm_medium=website, utm_campaign=audit_gratuit and utm_content from 13 allowlisted placement keys; unknown keys throw. It contains no email/website form submission, contact API or provider credential. The browser follows an external link; Digital Lab does not embed a provider form in this code. Refusal suppresses the local GA click event, not the user's ability to open the external funnel. TEST replaces live destinations; FAILOVER enables them only on allowed production hosts. The separate audit application link is not the Systeme.io funnel.

VERIFIED: scripts/check-audit-funnel-ui.mjs intercepts outbound traffic and verifies the site's links, UTMs, consent/credential suppression and click-intent events. It does not execute the real external form or prove a lead, confirmation email, provider cookies, contact creation, UTM storage, DPA or retention. Those operational behaviors are H owner reports or U live facts. The Digital Lab consent banner does not govern the external funnel's own scripts.

### Carousel script review and hosted CI proposal (not applied)

The script uses local preview servers for all three outputs, blocks non-local HTTP and non-GET/HEAD requests and WebSockets before navigation, uses isolated contexts and cleans up servers/browser. It asserts the 3750ms boundary, navigation, hover/focus, pause, reduced motion, image decode and layout across 18 scenarios. No production or credential action was found.

Coverage limits: it exercises the first AILabCarousel instance (shared component), uses viewport emulation without touch/mobile browser emulation, and force-clicks controls. It is not a physical-device, every-instance or full keyboard/tab-order audit. Its 1000ms initial pauseAt margin, 30ms state-settling wait and 300ms React polling budget merit monitoring for hosted-load flakiness. Do not mask failures with automatic retries or continue-on-error.

Proposed future change in .github/workflows/cloudflare-standby.yml, inside jobs.verify after the existing browser regressions and before artifact packaging:

```yaml
      - name: Check project carousel behavior
        run: node scripts/check-carousel-ui.mjs
```

All three builds and Chromium installation already precede that point. The required job stays named verify; default step failure blocks artifact packaging/deployment. No new permissions, secrets, deployment triggers or uploads are needed. Workflow modification is not authorized in this turn and has not been made. A future authorized CI change should receive its own commit and hosted run. The current workflow selects pricing and verify for an integration PR against main, but does not yet invoke this new script.

### Exact future commit and integration PR plan (not executed)

Preflight remote main must still be 9d153db5b2468d91067a87027452e7399da38ba5 and PR #19 base must still be 0dffb2a3278bd32459cc22fe4d384616e47de0e6; re-review any material movement. Work only in feat/dl-release-candidate-01. Compare the aggregate main...candidate diff as well as the five-file candidate overlay. No parent PR commits are cherry-picked or duplicated; #9 and #2 stay excluded.

After explicit authorization, stage exactly src/components/AILabCarousel.jsx and scripts/check-carousel-ui.mjs for commit `fix(ui): shorten project carousel autoplay interval`. Stage exactly the three reviewed docs for commit `docs(release): record single-owner approval and final gates`. Do not use git add -A. If the proposed CI inclusion is later authorized, add a separate `ci: verify project carousel behavior` commit touching only the reviewed workflow change. Future commit hashes cannot exist before those commits; record every full SHA after creation.

Only after separate push/PR authorization, open one Draft integration PR with head feat/dl-release-candidate-01, base main and title `Release candidate: privacy, standby CI and project carousel timing`. Its body must state that the aggregate includes #10-19, excludes #9/#2, records DL-SEC-DECISION-01 without enabling deployment, lists current baseline failures and unresolved provider/publication gates, and links exact-SHA evidence. Require successful pricing and verify against up-to-date main, resolve review threads and review Vercel's production policy before any separately authorized merge. Do not weaken branch protection to merge the early stack one PR at a time.

Lint/tooling disposition is separate: current hosted verify does not run full lint or this legacy header script. Decide whether to accept documented baseline debt or authorize a narrowly scoped follow-up; do not claim full lint is green and do not fold unrelated fixes into this candidate.

### Final-gates validation outcome

- Full lint: FAIL (exit 1), 2,629 errors and 3 warnings in the post-build worktree. Of these, 2,616 errors are generated/minified JavaScript under cloudflare-TEST.local, cloudflare-FAILOVER.local and validation.local/extracted-*; eslint.config.js ignores dist only and does not exclude these outputs.
- Clean exact-base lint, using a disposable git archive of 0dffb2a and the same dependency installation: FAIL (exit 1), 13 errors and 3 warnings. Source diagnostics match the candidate exactly (same paths, rules, lines, columns and messages); no new source diagnostic was introduced. Locations: cloudflare-build.config.js (1 error), src/App.jsx (9 errors/1 warning), RequestQuotes.jsx (3 errors/1 warning), RequestDocuments.jsx (1 warning). Evidence: validation.local/lint-comparison.json. Generated-output exclusions and inherited source fixes are separate potential LOTs, not implemented here.
- Inherited full header check: PASS (exit 0) in this Windows/Chromium run, 36 integrated/synthetic role-language-width result rows plus final normal-motion, keyboard and anchor checks. Desktop top/compact measurements are 150/116px; compact layouts are 68/62px. The historically documented 147-versus-150px failure was not reproduced. This is local evidence, not proof for every OS/browser. Evidence: validation.local/header-check.log and header-review.local/after-measurements.json.
- Candidate overlay review: the only application change relative to #19 remains 5000 -> 3750 in AILabCarousel; ServiceGallery/CSS, source beyond that line, lockfiles, workflows, API and infrastructure remain unchanged. This turn edits only the three explicitly authorized documentation files; the carousel regression script is reviewed but not modified.
- No completed unit/build/browser matrix was repeated unnecessarily. No commit, push, merge, deployment, credential access or provider change occurred. CLOUDFLARE_TEST_DEPLOY_ENABLED is not read or changed and must remain false.

## DL-RELEASE-INTEGRATION-01 ? current integration status

This section supersedes earlier local-only authorization and future CI/commit statements above. On 2026-11-22 the owner authorized preparing three scoped commits, pushing only feat/dl-release-candidate-01 and opening one Draft PR to main, conditional on no external deployment being triggered. No merge or deployment is authorized.

Live remote refs match main 9d153db5b2468d91067a87027452e7399da38ba5 and PR #19 head 0dffb2a3278bd32459cc22fe4d384616e47de0e6; the candidate remote branch does not yet exist. Live GitHub PR metadata and local ancestry establish inclusion of #10?19 and exclusion of #9 and #2. No parent patches are replayed.

The carousel regression is now integrated into jobs.verify after existing browser regressions and before packaging, with default failure propagation. The workflow diff adds exactly the requested two lines; permissions, secrets, triggers, job names and deployment protections are unchanged.

Integration validation: 116/116 unit tests PASS; release/pricing PASS; privacy-date PASS for unchanged 2026-11-17 only; carousel 18/18 PASS. actionlint 1.7.7 PASS for both workflows (shellcheck/pyflakes unavailable and disabled). Exact additive workflow comparison and ordering PASS. All prior build-source input hashes still match validation.local/source-identity.json, so the completed normal/TEST/FAILOVER builds and unrelated browser/audit evidence are retained without redundant execution. No new dependency audit was needed: lockfiles and build inputs are unchanged. Evidence uses integration-*.log in validation.local.

Pre-push STOP: authenticated read-only Vercel inspection shows READY Git preview dpl_EEg9C4ZYm3z2K3UtNwgFCAjrJxtS for feat/dl-ci-coverage-01 at the expected #19 head, created through source=git. vercel.json contains no feature-branch deployment exclusion. The connected project response does not expose branch auto-deployment settings, so an exclusion for this candidate cannot be proven. Feature pushes must be treated as potentially initiating an external Vercel Preview. Push and PR creation are withheld pending separate explicit authorization for that Preview side effect. No protection is disabled. GitHub pricing triggers on push/PR; verify triggers on PR to main; Cloudflare upload remains manual protected-main only with its existing activation guard. CLOUDFLARE_TEST_DEPLOY_ENABLED is not read or changed and must remain false.

Hosted pricing, verify and carousel results for this candidate are unavailable until a separately authorized push/PR. Base checks are not candidate checks. Privacy publication date and material provider/disclosure/retention decisions, current technical environment/rollback protections, successful hosted checks, explicit merge/deploy authorization and subsequent live acceptance remain release gates. Single-owner policy approval remains limited to the documented Cloudflare TEST decision.

### DL-LINT-HYGIENE-01 ? inherited debt, deferred

Record the established exact-base lint debt: 13 errors and 3 warnings, identical source diagnostics in candidate and base. The built worktree had 2,616 additional generated-output errors (2,629 total errors, 3 warnings). Evidence: validation.local/lint-comparison.json and prior lint logs. A separate scoped follow-up should address generated-directory exclusions and inherited source findings, preserving required quality gates. No lint config, unrelated source, workflow quality requirement or test is weakened here. The full lint audit is not repeated because its inputs have not changed.
