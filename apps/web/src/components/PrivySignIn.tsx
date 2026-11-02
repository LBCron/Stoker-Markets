"use client";

import { PrivyProvider, useLoginWithEmail, useLoginWithOAuth, usePrivy, type LinkedAccountWithMetadata, type User } from "@privy-io/react-auth";
import { useExportWallet, useStandardWallets } from "@privy-io/react-auth/solana";
import { registerWallet } from "@wallet-standard/wallet";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { BridgeProps } from "./SignIn";
import { EMBEDDED_WALLET_ICON, EMBEDDED_WALLET_NAME, PRIVY_APP_ID, type SignInAccount } from "@/lib/signIn";

type StandardWallet = Parameters<typeof registerWallet>[0];

/**
 * Privy's embedded Solana wallet, given to the app under its own name and icon through the Wallet Standard, so the
 * wallet adapter lists and signs with it like any wallet (ADR 0016; Privy's "Using Solana standard wallets" recipe).
 * Getters delegate, since the wallet's accounts change as it connects.
 */
function branded(wallet: StandardWallet): StandardWallet {
  return {
    get version() {
      return wallet.version;
    },
    get name() {
      return EMBEDDED_WALLET_NAME;
    },
    get icon() {
      return EMBEDDED_WALLET_ICON as StandardWallet["icon"];
    },
    get chains() {
      return wallet.chains;
    },
    get features() {
      return wallet.features;
    },
    get accounts() {
      return wallet.accounts;
    },
  };
}

/** The sign-in the user made, in the order a person would name themselves by. */
function accountOf(user: User | null): SignInAccount | null {
  if (!user) return null;
  if (user.google) return { provider: "google", label: user.google.name ?? user.google.email, picture: null };
  if (user.apple) return { provider: "apple", label: user.apple.email, picture: null };
  if (user.github) return { provider: "github", label: user.github.username ?? user.github.name ?? "GitHub", picture: null };
  if (user.twitter) return { provider: "twitter", label: user.twitter.username ? `@${user.twitter.username}` : (user.twitter.name ?? "X"), picture: user.twitter.profilePictureUrl };
  if (user.email) return { provider: "email", label: user.email.address, picture: null };
  return null;
}

/** The user's own Solana embedded wallet among their linked accounts (it exists before it is connected). */
function isEmbeddedSolana(a: LinkedAccountWithMetadata): a is Extract<LinkedAccountWithMetadata, { type: "wallet" }> {
  return a.type === "wallet" && a.chainType === "solana" && a.walletClientType === "privy";
}

function message(e: unknown) {
  return e instanceof Error && e.message ? e.message : "Sign in didn't complete. Try again.";
}

/** Inside the provider: reads its hooks, registers the embedded wallet once it exists, and publishes the state up. */
function Bridge({ onState }: BridgeProps) {
  const { ready, authenticated, user, logout } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const { wallets, ready: walletsReady } = useStandardWallets();
  const { exportWallet } = useExportWallet();
  const registered = useRef<string | null>(null);

  // The embedded wallet is the standard wallet Privy marks as its own; registered once, under the site's name.
  const embedded = useMemo(() => (walletsReady ? wallets.find((w) => "privy:" in w.features) ?? null : null), [wallets, walletsReady]);
  const embeddedAddress = authenticated ? (embedded?.accounts[0]?.address ?? user?.linkedAccounts.find(isEmbeddedSolana)?.address ?? null) : null;
  useEffect(() => {
    if (!embedded || registered.current) return;
    registerWallet(branded(embedded as unknown as StandardWallet));
    registered.current = embedded.name;
  }, [embedded]);

  const loginWith = useCallback(
    async (provider: "google" | "apple" | "github" | "twitter") => {
      try {
        await initOAuth({ provider });
      } catch (e) {
        throw new Error(message(e), { cause: e });
      }
    },
    [initOAuth],
  );
  const send = useCallback(
    async (email: string) => {
      try {
        await sendCode({ email });
      } catch (e) {
        throw new Error(message(e), { cause: e });
      }
    },
    [sendCode],
  );
  const withCode = useCallback(
    async (code: string) => {
      try {
        await loginWithCode({ code });
      } catch (e) {
        throw new Error(message(e), { cause: e });
      }
    },
    [loginWithCode],
  );
  const exportKey = useCallback(async () => {
    if (embeddedAddress) await exportWallet({ address: embeddedAddress });
  }, [exportWallet, embeddedAddress]);

  useEffect(() => {
    onState({
      enabled: true,
      ready,
      authenticated,
      account: authenticated ? accountOf(user) : null,
      embeddedAddress: registered.current && embeddedAddress ? embeddedAddress : null,
      loginWith,
      sendCode: send,
      loginWithCode: withCode,
      logout,
      exportWallet: embeddedAddress ? exportKey : null,
    });
  }, [onState, ready, authenticated, user, embeddedAddress, loginWith, send, withCode, logout, exportKey]);
  return null;
}

/**
 * The Privy tree, a leaf beside the app (never around it): the sheet is the site's own, so no Privy login UI is
 * configured; the embedded wallet is created for every social or email sign-in that has no wallet; its confirmation
 * modals are off, since the site's own review is the confirmation before a signature (the launch summary, the trade
 * review). Wallet users never touch Privy: they connect through the wallet adapter as before.
 */
export function PrivySignIn({ onState }: BridgeProps) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "apple", "github", "twitter", "email"],
        appearance: { walletChainType: "solana-only" },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
          ethereum: { createOnLogin: "off" },
          showWalletUIs: false,
        },
      }}
    >
      <Bridge onState={onState} />
    </PrivyProvider>
  );
}
