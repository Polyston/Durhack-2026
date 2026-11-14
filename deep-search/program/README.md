# Optional Anchor escrow upgrade

Status: source and TypeScript client prepared, **not compiled or deployed**. The browser currently uses Memo transactions and a separate wallet transfer. No deployed program ID or IDL has been fabricated.

1. Open https://beta.solpg.io and create an Anchor project.
2. Copy `lib.rs` into the program. Replace the placeholder `declare_id!` with Playground's actual program public key.
3. Build using Anchor 0.30.1 or adapt the generated project consistently if Playground uses another version. Fund the deployment wallet on devnet; deploy.
4. Export the generated IDL and copy it to `src/solana/idl.json`. Do not use an IDL from a different build.
5. Install `@coral-xyz/anchor@0.30.1`. Import the prepared helpers from `program/anchor-client.ts` in a separate integration page or wire them into `Settlement` before enabling escrow in the UI.
6. Use the same authority/operator for this upgrade. Call `createSearch`, then `submitCoverage` with the current commit counter, then `claimBounty` with the signed detection. Serialize commits to avoid counter/PDA collisions.
7. Verify create, commit and claim transactions on Explorer. Test an unregistered signer, wrong operator, duplicate claim and insufficient balance before presenting escrow as complete.

Two deliberate additions to the brief's account layout:

- Store `search_id` so later instructions can constrain the Search PDA with the original seeds.
- Require the operator to equal the funding authority. Otherwise a registered drone could nominate an arbitrary payout recipient. For distinct operator and authority wallets, add an immutable operator public key at creation and constrain against it instead.

The program reserves rent, uses checked arithmetic, rejects duplicate registrations and duplicate claims, and emits coverage/detection events. The transaction signature authorizes the registered drone's claim; the program does not independently verify physical detection or reconstruct the scan Merkle tree. Real recovery needs an authority/inspector attestation policy.

The System Program address in `declare_id!` is only an unmistakable placeholder. Never deploy or call it as if it were the Deep Search program.
