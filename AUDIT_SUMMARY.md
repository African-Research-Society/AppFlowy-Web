# AppFlowy-Web audit

## Executive Summary

Three commits ahead of upstream: rebrand, a Vite `envPrefix` lockdown, and embedding in the ARS member shell. The env lockdown is sound. The embed depends on nginx `frame-ancestors` and on a client query flag `connected=1`. No code change was made. Tightening the handoff needs a signed assertion agreed with AfriNexus, which is a product change.

## Architecture Overview

Browser AppFlowy. ARS iframes it from the member dashboard. CSP `frame-ancestors` is set in the Docker nginx configs to `self` and `https://africanresearchsociety.org`.

## Audit Coverage

The three ARS commits and the nginx/sign-in files they touch. Upstream Web was not re-audited.

## Confirmed Issues

`connected=1` on the return URL is a UI flag. AfriNexus must not treat it as proof of membership. Tokens are stripped from the hash before redirect, which is correct.

## Security Findings

- `frame-ancestors` is only on the nginx configs that set it. Locations that use their own `add_header` can drop the inherited CSP. Low–medium, deploy-dependent.
- Allowlist is the apex host only. `www` or a preview host is not included.
- Vite `envPrefix` restriction looks correct. Not raised as a bug.

## Bugs

None that are safe to patch without changing the embed contract.

## Compatibility Findings

Preview deployments on another host cannot iframe this build until that origin is added to `frame-ancestors`.

## Dead/Vestigial Code

Not searched upstream.

## Mapping/Consistency Problems

Handoff flag versus server-side membership check. The check belongs in AfriNexus before the iframe mounts.

## Performance/Reliability

Not examined.

## Testing Gaps

No embed test in this repo.

## Improvements

None landed.

## Fixes Implemented

None. Changing `connected=1` without the AfriNexus side would break the current handoff.

## Tests Added

None.

## Verification Performed

Read `src/application/session/sign_in.ts` and `docker/nginx.conf` / `docker/nginx-ssr.conf` against the three-commit range. Not built.

## Findings Not Fixed

CSP inheritance, host allowlist, client `connected` flag.

## Items Requiring Human Decision

Add every real parent origin to `frame-ancestors`, including preview hosts if those should embed. Replace `connected=1` with a server check in AfriNexus.

## Recommended Future Work

One signed “connected” assertion, verified by AfriNexus, and CSP on every HTML location.

## Statistics

- Commits examined: 3.
- Coverage: ARS delta only.
- Fixed: 0.
- Dependencies changed: none.
