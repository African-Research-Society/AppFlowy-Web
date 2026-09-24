# AppFlowy-Web audit (second pass)

## Coverage Matrix

| Subsystem | Depth | Notes |
| --- | --- | --- |
| Sign-in return to ARS | Deep | `src/application/session/sign_in.ts` |
| Vite env prefix | Deep | Browser env lockdown in the ARS commit |
| nginx frame-ancestors | Deep | `docker/nginx.conf`, `docker/nginx-ssr.conf` |
| Blob and verify client usage | Light | Same client-api patterns as the desktop repo; Web is a consumer |
| Document editor | Not applicable | Same exclusion as desktop: not the auth boundary |

## Findings

`connected=1` is a query flag after redirect. AfriNexus must not treat it as membership proof. `frame-ancestors` allows only `self` and `https://africanresearchsociety.org`, and only on nginx locations that do not replace headers. `www` and preview hosts are absent.

No code change. The flag is part of the current handoff.

## Fixed Findings

None.

## Unfixed Findings

CSP inheritance, host list, client connected flag.

## Security

Embed and token handling. Tokens are stripped from the hash before the ARS redirect.

## Database Integrity

Not in this repo.

## Authentication

Supabase session, then the Cloud verify path.

## Authorization

Server-side, in Cloud.

## Bugs

None safe to patch alone.

## Race Conditions

Not examined.

## Vestigial Code

Not swept.

## Mapping/Consistency Problems

`connected=1` versus a server session check in AfriNexus.

## Compatibility

Preview hosts cannot iframe this build until they are listed.

## Dependencies

Not upgraded.

## Performance

Not examined.

## Accessibility

Not examined.

## Testing

Not built.

## Cross-Repository Findings

AfriNexus `/workspace` and `/api/integrations/launch` mint the session this app consumes. Referrer policy for `/workspace` is fixed in AfriNexus.

## Product Decisions Required

Parent origins for CSP. Replace `connected=1` with a server check.

## Remaining Risks

Clickjacking if HTML is served from a location that drops the CSP header.

## Areas Where Audit Confidence Is Low

Which nginx file the live host actually uses.

## Verification

Read sign-in and both nginx configs. Not built.

## Metrics

- ARS commits: 3, all read.
- Upstream editor: not line-reviewed; named exclusion.
- Code fixes: 0.

## Pass 3 — stopped before completion

Web ledger unreviewed is 0 of 3654 rows. That is wave-1 file coverage, not a finished audit. Local unpushed fixes include http(s) URL gates, escaped table selectors, PDF open allowlist, import redirects kept on this origin, escaped textarea mirror text, and a quick-note list that no longer overwrites a note created while the list was loading. Mermaid loose render and the Google Drive raw URL fallback were left. Jest is not installed in this checkout, so the new URL checks were not executed. Waves 2 and 3 were not run.
