"use client";

import { useWallet, type Wallet } from "@solana/wallet-adapter-react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ProviderIcon } from "./ProviderIcon";
import { useSignIn } from "./SignIn";
import { SIGN_IN_PROVIDER, SOCIALS, type SocialProvider } from "@/lib/signIn";
import { LEGAL_LINKS } from "@/lib/site";
import styles from "./SignInSheet.module.css";

const [TERMS, PRIVACY] = LEGAL_LINKS;

/**
 * The one sheet behind every "Sign in" (owner, 2026-11-02; ADR 0016): the social sign-ins and email first, then the
 * Solana wallets in the browser, on the site's dialog primitive (a modal in the top layer, a sheet from the foot on a
 * phone). A wallet connects as before; a social or email sign-in gets the Stoker wallet, which the connector selects
 * once the provider has made it. Without a provider (no app id, no stand-in) the sheet offers the wallets alone, and
 * the custody note goes with the sign-ins it describes. `foot` is the header's light-or-dark toggle, kept where the
 * menu this sheet replaced had it.
 */
export function SignInSheet({ open, onClose, onWallet, foot }: { open: boolean; onClose: () => void; onWallet: (wallet: Wallet) => void; foot?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const signIn = useSignIn();
  const { wallets } = useWallet();
  const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable);
  const [busy, setBusy] = useState<SocialProvider | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Once signed in the sheet has done its work: the connector selects the wallet and the control shows the account.
  useEffect(() => {
    if (open && signIn.authenticated) onClose();
  }, [open, signIn.authenticated, onClose]);

  if (!open) return null;

  const social = async (provider: SocialProvider) => {
    setError(null);
    setBusy(provider);
    try {
      await signIn.loginWith(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const sendCode = async (e: FormEvent) => {
    e.preventDefault();
    const to = email.trim();
    if (!to) return;
    setError(null);
    setBusy("email");
    try {
      await signIn.sendCode(to);
      setSentTo(to);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const withCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setBusy("email");
    try {
      await signIn.loginWithCode(code.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const providerReady = signIn.enabled && signIn.ready;

  return createPortal(
    <dialog
      ref={dialog}
      className={`dialog ${styles.dialog}`}
      aria-labelledby={title}
      onClose={onClose}
      onClick={(e) => {
        // A press on the backdrop reaches the dialog itself, outside its own box.
        const r = e.currentTarget.getBoundingClientRect();
        if (e.target === e.currentTarget && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) onClose();
      }}
    >
      <div className={styles.head}>
        <h2 id={title} className={`t-h3 ${styles.title}`}>Sign in</h2>
        <button type="button" className={`button button-ghost button-sm ${styles.close}`} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="m5 5 10 10M15 5 5 15" />
          </svg>
        </button>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {signIn.enabled && (
        <>
          <ul className={styles.socials} aria-label="Sign in with">
            {SOCIALS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`button button-ghost ${styles.option}`}
                  onClick={() => social(s.id)}
                  disabled={!providerReady || busy !== null}
                  aria-busy={busy === s.id || undefined}
                >
                  <ProviderIcon provider={s.id} className={styles.mark} />
                  <span>{busy === s.id ? `Opening ${s.label}…` : `Continue with ${s.label}`}</span>
                </button>
              </li>
            ))}
          </ul>

          {sentTo ? (
            <form className={styles.email} onSubmit={withCode}>
              <p className={styles.sent}>
                We sent a code to <strong>{sentTo}</strong>.{" "}
                <button type="button" className={styles.textButton} onClick={() => { setSentTo(null); setCode(""); setError(null); }}>
                  Use another email
                </button>
              </p>
              <div className={styles.row}>
                <label className={`input ${styles.field}`}>
                  <span className="visually-hidden">Code from the email</span>
                  <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="Code" autoFocus />
                </label>
                <button type="submit" className="button button-primary" disabled={!code.trim() || busy !== null} aria-busy={busy === "email" || undefined}>
                  {busy === "email" ? "Signing in…" : "Sign in"}
                </button>
              </div>
            </form>
          ) : (
            <form className={styles.email} onSubmit={sendCode}>
              <div className={styles.row}>
                <label className={`input ${styles.field}`}>
                  <ProviderIcon provider="email" className={styles.mark} />
                  <span className="visually-hidden">Email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="Email" />
                </label>
                <button type="submit" className="button button-ghost" disabled={!providerReady || !email.trim() || busy !== null} aria-busy={busy === "email" || undefined}>
                  {busy === "email" ? "Sending…" : "Send code"}
                </button>
              </div>
            </form>
          )}

          <p className={styles.or} aria-hidden="true">
            <span>or a Solana wallet</span>
          </p>
        </>
      )}

      {installed.length === 0 ? (
        <p className={styles.empty}>
          No Solana wallet found in this browser. Install{" "}
          <a href="https://phantom.com" target="_blank" rel="noreferrer">Phantom</a> or{" "}
          <a href="https://solflare.com" target="_blank" rel="noreferrer">Solflare</a>, then reload.
        </p>
      ) : (
        <ul className={styles.wallets} aria-label="Wallets">
          {installed.map((w) => (
            <li key={w.adapter.name}>
              <button type="button" className={`button button-ghost ${styles.option}`} onClick={() => onWallet(w)}>
                <img src={w.adapter.icon} alt="" width={20} height={20} className={styles.walletIcon} />
                <span>{w.adapter.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.note}>
        {signIn.enabled
          ? `A Google, Apple, GitHub, X or email sign-in gets a Solana wallet of its own, made and held with ${SIGN_IN_PROVIDER}: its key is split between ${SIGN_IN_PROVIDER}'s enclave and your sign-in, and you can export it any time. `
          : ""}
        Stoker never holds your funds or your keys.{" "}
        <a href={TERMS.href} target="_blank" rel="noreferrer">{TERMS.label}</a> · <a href={PRIVACY.href} target="_blank" rel="noreferrer">{PRIVACY.label}</a>
      </p>
      {foot && <div className={styles.foot}>{foot}</div>}
    </dialog>,
    document.body,
  );
}
