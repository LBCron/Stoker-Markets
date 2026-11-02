# Sign in: social and email sign-ins through an embedded-wallet provider, beside the wallets

Status: accepted by the owner on 2026-11-02 (#159, asked on 2026-10-31 on #133 and again on the launch flow's review page, #136), built in `apps/web`.

The owner wants "Sign in" where the site said "Connect wallet": Google, Apple, GitHub, X and email beside every Solana wallet, as the launchpads people come from offer it.
A wallet cannot do that by itself, and an identity service (Clerk, Auth0) gives a session but nothing that can sign a launch or a trade: a Google user would sign in and still have no wallet.
Social sign-in on a Solana site means an embedded-wallet provider, which authenticates the person and makes a Solana wallet for them that signs on their behalf.

## Decision

- **Privy is the sign-in provider.**
  Its React SDK is Apache-2.0, runs on React 19 and Next.js, and is free to 500 monthly active users (then $299 a month to 2,500).
  It signs people in with Google, Apple, GitHub, X (Twitter) and an email code through whitelabel hooks, so the sheet is the site's own design (every verdict of #130 stands), and it makes a Solana embedded wallet for each sign-in that has none.
- **The embedded wallet is a Wallet Standard wallet to the app.**
  Privy exposes it in the standard's shape (`useStandardWallets`), and the site registers it with the window under its own name and icon as the **Stoker wallet** (`EMBEDDED_WALLET_NAME`), so the wallet adapter lists it, selects it and signs with it like Phantom.
  The trade panel, the launch form, the creator page and every signing path stay what they are: the server builds, the wallet signs (ADR 0003).
- **Wallet users never touch Privy.**
  A Phantom, Solflare or Backpack user connects through the wallet adapter as before, with no sign-in-with-Solana and no Privy account, so they pay no extra signature and count toward no monthly active user.
- **One control, one sheet.**
  "Sign in" stands everywhere "Connect wallet" stood (the header, the launch summary's action slot, the trade panel, the creator page, the phone's account sheet) and opens `SignInSheet`: Google, Apple, GitHub and X, email with its code, then the Solana wallets in the browser.
  Without an app id at build (`NEXT_PUBLIC_PRIVY_APP_ID`) the sheet offers the wallets alone and the custody note shrinks to the one sentence that is always true.
- **The site's review is the confirmation.**
  Privy's own wallet confirmation modals are off (`showWalletUIs: false`): a launch is confirmed by the launch summary's review and a trade by the trade review, both of which name the exact amounts before the action, and the signing panel then says "Signing with your Stoker wallet" rather than "Confirm in your wallet".
  The one Privy UI the site shows is the export of the wallet's key, which should not be ours to draw.
- **Custody, in the site's words.**
  A Stoker wallet's key exists only as two encrypted shares, one held in Privy's enclave and one released by the sign-in, recombined inside the enclave to sign; the user can export it at any time; and account access is wallet access, so whoever controls the Google, Apple, GitHub, X or email account controls the wallet.
  The sheet's note, the terms, the privacy notice and the risk disclosure say so; "Stoker never holds your funds or your keys" stays true for both kinds of wallet.
- **Funding by address first.**
  A new Stoker wallet is empty, so the account menu shows its full address with a copy button and its SOL balance, and says to send SOL from an exchange or another wallet.
  Privy's deposit modal (cards, bank transfer, crypto from another chain) waits on the owner enabling it in the dashboard and is a later unit.
- **The account menu names the sign-in** (the name, handle or email it gave, with X's picture when there is one) above the wallet, offers Export key for a Stoker wallet, and ends with Sign out, which disconnects the wallet and ends the provider's session so nothing reconnects.
  A chosen display name and picture shown on a Creator's coins is a feature of its own (an API table, moderation, the coin page) and is filed separately.
- **The provider's tree is a leaf beside the app, never around it.**
  `SignInProvider` holds the state the app reads (`useSignIn`); the Privy tree renders under it as a client-only bridge that publishes its hooks' state upward, loaded only when an app id is set.
  The server render and a build without an app id carry none of Privy's code, and the Workers runtime never sees it.
- **The UI suite stands the provider in.**
  `tests/ui/src/wallet.ts` installs `window.__stokerSignIn` before any app code, as it installs the test wallet: its social and email sign-ins answer like the provider's, a sign-in registers a Stoker wallet that signs with the test key, and the whole signed-in flow (the sheet, the menu, a launch, sign out) is proven without Privy.
  The real sign-in is proven by hand on the dev site and the rehearsal, with the owner's app id.

## Considered Options

- **Clerk, Auth0 or any identity service alone**: a session with no key to sign with; every buy would still need a wallet, which is the thing the owner wants people to be able to do without.
- **Dynamic**: the same shape as Privy (MIT SDK, socials, embedded Solana wallets), now part of Fireblocks; its sandbox is free but live mode is a paid plan from $249 a month, so a site with a handful of users pays before it earns.
- **Web3Auth, Magic, Turnkey, Para**: workable, but none documents handing its embedded wallet to the Solana wallet adapter, so more of our code would change, and none has Privy's precedent among Solana launchpads.
- **Privy's own login modal**: one import, but a foreign UI in the one place the research says must read as the site's; the whitelabel hooks cost a sheet and keep the design whole.
- **Privy for wallet users too (sign in with Solana)**: one account model, at the price of an extra signature at every connection and a monthly active user per wallet user, for a profile the site does not yet have.

## Consequences

- A third party sits in the sign-in path: its dashboard holds the login methods, the allowed domains and the OAuth apps (runbook, section 14), its status affects sign-ins, and its pricing meter is monthly active users.
- Builds with an app id grow by Privy's chunk, loaded on the client after hydration; the UI suite's stack sets no app id, so its measurements are of the site without it.
- Two kinds of wallet now sign: the legal pages describe both, and the signing panel names which one is at work.
- WalletConnect, Torus and a Ledger plugged in directly are not in the sheet: the sheet lists the wallets the browser has, a Ledger reaches the site through Phantom or Solflare, and WalletConnect needs a Reown project of the owner's; each is a follow-up when asked for.
