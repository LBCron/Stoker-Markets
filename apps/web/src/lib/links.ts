import { LINK_KINDS, type LinkKind } from "@launchpad/contract";

export { LINK_KINDS, type LinkKind };

/** Each link kind as the site names it and the address it starts a field with. */
export const LINK_INFO: Record<LinkKind, { label: string; placeholder: string }> = {
  telegram: { label: "Telegram", placeholder: "https://t.me/" },
  x: { label: "X", placeholder: "https://x.com/" },
  website: { label: "Website", placeholder: "https://" },
  discord: { label: "Discord", placeholder: "https://discord.gg/" },
  tiktok: { label: "TikTok", placeholder: "https://tiktok.com/@" },
  instagram: { label: "Instagram", placeholder: "https://instagram.com/" },
  youtube: { label: "YouTube", placeholder: "https://youtube.com/@" },
};

/** The kinds the launch form shows first; the rest wait behind "More links". */
export const FIRST_LINKS: readonly LinkKind[] = ["telegram", "x", "website"];
export const MORE_LINKS: readonly LinkKind[] = LINK_KINDS.filter((k) => !FIRST_LINKS.includes(k));
