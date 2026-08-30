# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro with Tailwind CSS, chosen by the user. Self-hosted: deployed to the user's own homelab, not a managed platform (no Vercel/Netlify/Pages build constraints; the output must be servable from the user's own infrastructure).

## Users

Two primary audiences visiting the same site, both evaluating Martin as an individual:

- **Recruiters and hiring managers**, skimming quickly — often on mobile, often between other candidates — deciding whether Martin is worth an interview.
- **Prospective freelance clients**, deciding whether Martin can be trusted to take a piece of work end to end and whether to start a conversation.

Both arrive with limited time and no prior context. Neither is assumed to be technical.

## Product Purpose

A personal portfolio site for Martin. It exists to convert a cold visitor into contact — an interview request or a freelance inquiry — by making it quickly credible that Martin builds real, shipped software end to end. Success is a visitor who understands what Martin does and reaches out.

## Positioning

Full-stack product building: Martin designs and builds end to end, taking an idea to a shipped product himself. The claim a neighbouring portfolio could not truthfully copy is that the work on display was carried the whole way by one person, rather than a contribution to someone else's product.

## Operating Context

- Visitors arrive cold, frequently from a link (application, message, referral) rather than by search.
- Mobile skim-reading is a first-class scenario, not a fallback.
- The site is read in two languages by two overlapping audiences: Hungarian-speaking local recruiters and clients, and English-speaking international ones.
- Self-hosted on the user's homelab, so build output and runtime dependencies must stay under the user's own control.

## Capabilities and Constraints

- **Bilingual: Hungarian and English.** Both languages carry the full site, not a partial translation. **English is the default on first arrival**, with a manual switch to Hungarian; no automatic browser-language redirect. How the switch is presented and whether the choice persists are undecided.
- Astro + Tailwind; static output suitable for homelab hosting.
- **Undecided, do not invent:** the site's domain; whether a contact form (needing a backend) or direct contact links are used; whether the site includes writing/blog, a CV download, or an about page beyond the essentials.

## Brand Commitments

Name as displayed: **Porkoláb Martin** (Hungarian name order; the English surface may use "Martin Porkoláb"). Handles, an existing logo, and any existing personal visual identity have not been supplied and must not be assumed.

## Evidence on Hand

Two real projects, confirmed by the user, are ready to be shown:

1. **edortech.hu** — live and publicly reachable, built full-stack by Martin with Astro, Three.js, and Tailwind CSS. **Client work, delivered solo:** an external client, carried end to end from design through deploy. This is the strongest available proof of the end-to-end positioning and should lead.

   Verified by visiting the live site: the client is **Edortech**, a European deep-tech battery materials company developing next-generation anode technology (its flagship programme is named ONLi) plus cell-level validation and testing services for lithium-ion and sodium-ion batteries. Its CEO is Dr. Vida Ádám. The site is itself bilingual (Hungarian at `/hu/`, English available), content-heavy and long-form, with a dark, technical, restrained visual treatment and a green accent; it serves cell manufacturers, technology companies, researchers, and industrial partners. The brand voice is explicitly evidence-led — it separates proven results from stated goals.

   This makes the case study a strong story: a serious B2B deep-tech client, a bilingual content-heavy site, and 3D work. **Confirmed by the user:** Martin may name Edortech publicly as a client, and the design is his as well as the build — concept, visual design, 3D, front end, and deploy, all solo. Still not supplied: the engagement's dates and duration, and any outcome or result the client achieved. **No outcome or performance claim may be published for this project** until the user provides one.
2. **Football predictor** — a machine-learning project that predicts the events/outcomes of football matches. **Still in development:** it must be presented as in-progress, with no claim that it is finished, deployed, or publicly usable. Stack, data source, model approach, and accuracy are not yet supplied.

Screenshots, case-study copy, dates, and links beyond `edortech.hu` are still to be collected. There are no testimonials, client logos, employer names, press mentions, or performance/impact numbers on hand; absent explicit input from the user, the site must not display any — including any accuracy figure for the predictor.

## Product Principles

1. **Credible in sixty seconds.** A skimming recruiter must grasp who Martin is and what he has built before scrolling far; depth is available but never required.
2. **The work carries the argument.** Two real projects shown well beat a long list of claims or skill badges.
3. **End-to-end is the throughline.** Every case study makes clear that one person took it from idea to shipped.
4. **Both languages are first-class.** Neither Hungarian nor English is a degraded translation of the other, in content or in layout.
5. **Never fabricate proof.** No invented clients, metrics, testimonials, or logos; empty is better than false. Unfinished work is labelled unfinished rather than dressed up as shipped.

## Accessibility & Inclusion

No product-specific standard was established. Mobile-first legibility and full keyboard access are treated as baseline expectations given the skim-on-mobile scenario.
