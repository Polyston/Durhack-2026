# Delivery checklist

## Implemented locally

- Pure TypeScript simulator with the specified prior, Bayesian update, target score, sensing and seeded randomness.
- Three strategies, delayed/lossy communication, capped gossip, contiguous version vectors, kill controls and storms.
- Live offline signatures, registered-key verification, canonical Merkle roots and background devnet Memo/transfer code.
- Responsive Canvas mission UI, selected-drone belief, controls, metrics, event links and measured results chart.
- Automated tests, full experiment runner, raw results and a labeled backup simulation replay video.
- Optional Anchor source/client, six-slide content deck, three-minute pitch and Devpost draft.

## Requires an external environment or event attendee

1. **Browser QA:** this sandbox refused listening sockets (`EPERM`). Run `npm run dev` outside it; exercise every control at desktop and mobile widths.
2. **Devnet:** RPC/package hosts were unreachable from the shell. Enable devnet in the UI, fund the two displayed addresses using the faucet, surface a batch and confirm the Explorer transaction. No transaction was claimed as completed here.
3. **Anchor:** `cargo check --offline` cannot resolve `anchor-lang`; the JS Anchor package is also unavailable. Compile/deploy in Playground, copy the real IDL/program ID, connect the client helpers and test the escrow before claiming it works.
4. **Repository:** the project remote is https://github.com/Polyston/Durhack-2026 on `main`. Do not commit node_modules or wallet secrets.
5. **Neptune stand:** ask whether a simulation meets their requirements. A physical stand visit cannot be performed from this environment.
6. **Prize requirements:** https://mlh.link/solana returned no readable content; https://durhack-2026.devpost.com/ was unavailable to the research tool. Confirm eligibility and that both desired prize selections are permitted. Do not use an older DurHack event page as evidence.
7. **Submission:** review the draft, fill the team/repository/demo URLs, upload the replay or a final UI recording, and submit through the correct event form. No Devpost submission was made.
8. **Deck:** six-slide content is in `slides.md`. PowerPoint authoring tools were unavailable. Present the content directly or import it into your preferred slide editor.

## Acceptance still contingent on evidence

The brief's expected ranking of strategies is a hypothesis. Use `results-summary.md`; do not change or selectively omit results to make a prize narrative. A useful negative result is better than an unsupported performance claim.

Reference checked for Anchor structure: https://www.anchor-lang.com/docs/basics/program-structure . This supports the implementation pattern, not a claim that this program was compiled or audited.
