# ADR-005: Hosting on an Oracle Cloud free VM behind Cloudflare

**Status:** Accepted
**Date:** 2026-11-11

## Context

Hosting must be free (ADR-004) and run the whole stack: the Next.js site, the Laravel API and PostgreSQL. The project is also a study ground for server hardening, edge protection and security testing against its own environment, which needs control over the server.

Free plans of managed platforms put services to sleep after a few minutes without traffic, expire free databases, or advise against production use. Free virtual machines stay on, but the provider can change or withdraw the offer.

## Decision

Run the stack on an Oracle Cloud "Always Free" Ampere A1 virtual machine (2 OCPUs, 12 GB of memory, 200 GB of storage), with the same Docker Compose setup used locally.

Cloudflare (free plan) sits in front for DNS, TLS, caching and the web application firewall. The server receives traffic only through a Cloudflare Tunnel, with no inbound HTTP or HTTPS ports open to the internet.

## Consequences

- The production environment matches the local one, so deployment does not require a separate setup, and the server is available to study hardening and security testing.
- Oracle may reclaim Always Free instances it considers idle (CPU, network and memory usage below about 20% over seven days), and has reduced the free allowance before with little notice. To limit the impact:
  - the database is backed up outside Oracle, and restoring it is tested;
  - an external uptime monitor reports outages;
  - rebuilding the server on a new machine, or on another provider, is documented and relies only on Docker Compose and the backups.
- Server maintenance (operating system updates, firewall, SSH access with keys only) is the project's responsibility.
- The account's home region cannot be changed later, and free Ampere capacity is limited in busy regions.
