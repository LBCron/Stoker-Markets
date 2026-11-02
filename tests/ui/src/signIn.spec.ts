// Sign in (ADR 0016): the one sheet with the social and email sign-ins and the wallets, through the provider's stand-in;
// the Stoker wallet a sign-in gets, which launches like any wallet; and the sheet with the wallets alone when there is
// no provider.
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { fillForm, review, signButton } from "./launchPage";
import { SIGN_IN_ACCOUNTS, SIGN_IN_CODE, STOKER_WALLET_NAME, TEST_WALLET_NAME, openSignIn, signInState } from "./wallet";

const headerSignIn = (page: Page) => page.getByRole("banner").getByRole("button", { name: "Sign in" });
const connectedAs = (page: Page, name: string) => page.getByRole("banner").getByTitle(`Connected with ${name}`);

test("a Google sign-in gets a Stoker wallet that launches a coin, and signing out ends the session", async ({ page, wallet }) => {
  await page.goto("/launch");
  const sheet = await openSignIn(page, page.getByRole("main").getByRole("button", { name: "Sign in" }));
  await expect(sheet.getByRole("list", { name: "Sign in with" }).getByRole("button")).toHaveText([
    "Continue with Google",
    "Continue with Apple",
    "Continue with GitHub",
    "Continue with X",
  ]);
  await expect(sheet.getByRole("textbox", { name: "Email" })).toBeVisible();
  await expect(sheet.getByRole("list", { name: "Wallets" }).getByRole("button")).toHaveText([TEST_WALLET_NAME]);
  await expect(sheet).toContainText("made and held with Privy");
  await sheet.getByRole("button", { name: "Continue with Google" }).click();
  await expect(sheet).toHaveCount(0);

  // The Stoker wallet connects by itself and the form is ready to review; the menu names the sign-in and the wallet.
  await expect(page.getByRole("button", { name: "Review launch" })).toBeVisible();
  const address = wallet.keypair.publicKey.toBase58();
  await connectedAs(page, STOKER_WALLET_NAME).click();
  const menu = page.getByRole("menu", { name: `Connected with ${STOKER_WALLET_NAME}` });
  await expect(menu).toContainText(SIGN_IN_ACCOUNTS.google);
  await expect(menu).toContainText("Your Stoker wallet");
  await expect(menu).toContainText(address);
  await expect(menu.getByText(/\d\.\d{4} SOL/)).toBeVisible();
  await expect(menu.getByRole("button", { name: "Copy address" })).toBeVisible();
  await menu.getByRole("menuitem", { name: "Export key" }).click();
  expect((await signInState(page)).exports).toBe(1);
  await expect(menu).toHaveCount(0);

  // The launch is signed by the Stoker wallet after the site's own review, with no wallet prompt.
  await fillForm(page, { name: "Signed In", symbol: "SGND" });
  await page.getByRole("button", { name: "Review launch" }).click();
  await expect(review(page)).toBeVisible();
  await signButton(page).click();
  await page.waitForURL(/\/coin\/[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  expect(wallet.requests).toHaveLength(1);
  expect(wallet.requests[0]!.message.staticAccountKeys[0]!.equals(wallet.keypair.publicKey)).toBe(true);

  // The session holds across a page load: the Stoker wallet connects again by itself.
  await page.goto("/coins");
  await expect(connectedAs(page, STOKER_WALLET_NAME)).toBeVisible();

  // Signing out disconnects the wallet and ends the provider's session, so nothing reconnects, not after a load either.
  await connectedAs(page, STOKER_WALLET_NAME).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(headerSignIn(page)).toBeVisible();
  const state = await signInState(page);
  expect(state.logouts).toBe(1);
  expect(state.authenticated).toBe(false);
  await page.reload();
  await expect(headerSignIn(page)).toBeVisible();
});

test("an email sign-in asks for the code, and a wrong code is told so", async ({ page, wallet }) => {
  await page.goto("/coins");
  const sheet = await openSignIn(page, headerSignIn(page));
  await sheet.getByRole("textbox", { name: "Email" }).fill("ada@example.com");
  await sheet.getByRole("button", { name: "Send code" }).click();
  await expect(sheet).toContainText("We sent a code to ada@example.com");
  const code = sheet.getByRole("textbox", { name: "Code from the email" });
  await code.fill("000000");
  await sheet.getByRole("button", { name: "Sign in" }).click();
  await expect(sheet.getByRole("alert")).toHaveText("That code isn't right. Check the email and try again.");
  await code.fill(SIGN_IN_CODE);
  await sheet.getByRole("button", { name: "Sign in" }).click();
  await expect(sheet).toHaveCount(0);
  expect((await signInState(page)).account).toEqual({ provider: "email", label: "ada@example.com", picture: null });
  await connectedAs(page, STOKER_WALLET_NAME).click();
  await expect(page.getByRole("menu", { name: `Connected with ${STOKER_WALLET_NAME}` })).toContainText("ada@example.com");
  expect(wallet.requests).toHaveLength(0);
});

test.describe("without a provider", () => {
  test.use({ socialSignIn: false });

  test("the sheet offers the wallets alone", async ({ page, wallet }) => {
    await page.goto("/coins");
    const sheet = await openSignIn(page, headerSignIn(page));
    await expect(sheet.getByRole("button", { name: /^Continue with/ })).toHaveCount(0);
    await expect(sheet.getByRole("textbox")).toHaveCount(0);
    await expect(sheet).not.toContainText("Privy");
    await expect(sheet.getByRole("list", { name: "Wallets" }).getByRole("button")).toHaveText([TEST_WALLET_NAME]);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    expect(wallet.requests).toHaveLength(0);
  });
});
