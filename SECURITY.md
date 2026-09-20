# Reporting a security problem

Write to **hola@aragort.com**. Say what you found, how to reproduce it, and what
you think it lets someone do. You will get an answer within a week; if you do
not, assume the mail went astray and send it again.

Please do not open a public issue for anything that could be used before it is
fixed. GitHub's private vulnerability reporting is enabled on this repository
and goes to the same person.

This is a tool maintained by one person. There is no bounty and no formal SLA.
What there is: a real report gets read and acted on, and you will be credited if
you want to be.

## What this tool is

`bloqueado.aragort.com` aggregates public evidence about internet restrictions
in Venezuela. Someone enters a domain; the app combines the VE Sin Filtro
dataset, OONI measurements, a probe run from the server, and a probe run from
the visitor's own browser, then explains what the combination is consistent
with. It does not prove censorship, and the wording is deliberately cautious.

That purpose sets the threat model. The people most likely to use it are
choosing what to read under a government that restricts what they can reach.
A bug that leaks who asked about what matters more here than it would on an
ordinary site.

## What is in scope

This repository and what it serves at `bloqueado.aragort.com`. Unlike a static
site, there is a server, and it makes outbound requests:

- **The server-side probe** (`src/services/server-probe.ts`). It takes a
  visitor-supplied domain, resolves it, and makes one HTTPS `HEAD` request to
  it from the VPS. It is the SSRF surface of this app and it is deliberately
  fenced: private, loopback, link-local and multicast ranges are rejected after
  resolution, and the validated IP is then pinned through the connect lookup so
  a DNS record that changes between validation and fetch cannot redirect the
  request inward. **A way past either fence is the highest-value report here.**
  So is a way to make it reach a host on the VPS's own network.
- **The OONI client** (`src/services/ooni-client.ts`). The server queries
  `api.ooni.io` for the requested domain and caches the answer in memory for 15
  minutes. The cache is keyed by domain and shared between visitors; a way to
  make one visitor's query surface in another's response is in scope.
- **Input validation** (`src/domain/target-validation.ts`). Everything above
  starts from a string a stranger typed.
- **The report endpoint** (`POST /api/report`). It writes to a JSONL file on
  disk. Path traversal, unbounded writes, or a way to store a report without
  consent are all in scope.
- **The rate limiter** (`src/services/rate-limit.ts`). It buckets on the client
  IP as written by the CDN edge. A way to make it bucket on a value a visitor
  controls — and so walk past the limit, or push another visitor into a full
  bucket — is in scope.
- **The response headers.** `src/middleware.ts` builds the
  Content-Security-Policy with a per-request nonce, and `next.config.ts` sets
  the rest. A way to make the app emit a policy that does not cover a script it
  shipped is in scope.
- **The evidence pipeline.** `src/services/csv-evidence.ts` and
  `src/domain/diagnosis.ts` turn the VE Sin Filtro dataset into a verdict. A way
  to make the app state a conclusion the data does not support is a real bug in
  a tool like this one, and it is in scope even though it is not a memory-safety
  problem.
- **The container.** `Dockerfile` and `docker-compose.yml`.

## What is not

- The CDN and the host. TLS is terminated in front of this container, the edge
  appends headers of its own and sets its own cookie. Report those to their
  operators.
- The accuracy of the VE Sin Filtro dataset or of OONI measurements. Both are
  upstream sources, republished here with attribution. Errors in the data belong
  upstream; errors in how this app *reads* the data are in scope, above.
- Build-time-only dependency advisories. The production image is the Next.js
  standalone output and carries only the packages the server actually loads. If
  you can show a path from a visitor's request to a build-only package, that is
  in scope and I would like to see it.
- Anything that needs a stolen credential, physical access, or a compromised
  maintainer machine to begin with.
- Reports from an automated scanner with nothing behind them: missing headers on
  a page with no session and no login, TLS ciphers the CDN chose, a version
  number in a banner. If you think one of these is exploitable here, show the
  exploit and it is in scope.

## What the tool knows about whoever queries it

Stated plainly, because for this tool it is the thing worth protecting.

**The domains you look up are not logged.** There is no analytics, no tracker,
and nothing writes your query to disk. One exception, and it is real: if the
OONI request fails, the failure is written to the container's stderr, and the
error text can contain the domain you asked about. Those logs live on the VPS
and are not shipped anywhere.

**No accounts, no sessions, no cookies from this app.** The only browser storage
it uses is `localStorage`, for your theme and language choice. It never leaves
your browser. The `deflect_session` cookie you will see is set by the CDN in
front of the app, not by the app.

**Your IP is held in memory, briefly.** The rate limiter keeps the IP the CDN
reports as a key in an in-process map, with a timestamp, and sweeps entries
older than an hour. It is never written to disk and never leaves the process.
Restarting the container erases it.

**The server-side probe protects you; the browser-side probe does not.** When
the server checks a domain, the site you asked about sees the VPS, not you — and
OONI sees the domain, not you. But the whole point of the second check is to
test *your* connection, so your browser connects to the domain directly and that
site sees your real address, exactly as if you had visited it. The optional
comparison run, which probes several known-restricted domains at once, only
happens after you press the button that says so. **If reaching those domains
from your network is itself a risk for you, do not run the comparison.**

**Reports are stored only if you tick the box.** A submitted report keeps the
domain, the ISP you selected, the browser result, the diagnosis, your notes and
a timestamp. It does not keep your IP address or your user agent, and the
endpoint refuses to store anything without explicit consent.

**The CDN and the VPS keep their own request logs**, on their own terms. That is
outside this repository, and it is the part this file cannot make promises
about.
