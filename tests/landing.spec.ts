import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { calculateCostComparison } from "../src/model";

test("cost model changes the decision and rejects invalid estimates", () => {
  expect(calculateCostComparison(0)).toEqual({
    agentA: 400,
    agentB: 1180,
    preferred: "A",
    difference: 780,
  });
  expect(calculateCostComparison(250)).toEqual({
    agentA: 5400,
    agentB: 1680,
    preferred: "B",
    difference: 3720,
  });
  expect(calculateCostComparison(1000)).toEqual({
    agentA: 20400,
    agentB: 3180,
    preferred: "B",
    difference: 17220,
  });
  expect(calculateCostComparison(40).preferred).toBe("A");
  expect(calculateCostComparison(50).preferred).toBe("B");
  expect(() => calculateCostComparison(-1)).toThrow(RangeError);
  expect(() => calculateCostComparison(NaN)).toThrow(RangeError);
  expect(() => calculateCostComparison(Infinity)).toThrow(RangeError);
});

test.beforeEach(async ({ page }) => {
  await page.goto("./");
});

test("loads with local assets, honest positioning and no runtime errors", async ({
  page,
  baseURL,
}) => {
  const errors: string[] = [];
  const failures: string[] = [];
  const externalRequests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  page.on("request", (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL!).origin)
      externalRequests.push(request.url());
  });
  await page.reload();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveTitle("ADI — Agent Decision Intelligence");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Know which agent to deploy. And where to keep a human.",
  );
  await expect(page.getByText("Seeking design partners")).toBeVisible();
  await expect(
    page.getByText("Synthetic example, not a customer result.", {
      exact: false,
    }),
  ).toBeAttached();
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("hero explains the service and deliverable before scrolling", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".hero-copy > p")).toContainText(
      "We compare AI agents on your real workflows",
    );
    await expect(page.locator(".hero-caption")).toContainText(
      "a comparative evaluation and a deployment recommendation",
    );
    const action = page.getByRole("link", {
      name: "Explore an evaluation pilot",
      exact: true,
    });
    const bounds = await action.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThan(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
  }
});

test("has no horizontal overflow at representative viewport widths", async ({
  page,
}) => {
  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `overflow at ${width}px`).toBeLessThanOrEqual(
      dimensions.viewport,
    );
  }
});

test("story stages can be explored with explicit controls", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Stage 2: cost of failure" }).click();
  await expect(page.locator("#panel-title")).toHaveText(
    "The average hides the stakes.",
  );
  await expect(
    page.getByRole("button", { name: "Stage 2: cost of failure" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Stage 3: deployment decision" })
    .click();
  await expect(page.locator("#panel-title")).toHaveText(
    "A decision, not a leaderboard.",
  );
  await page.getByRole("button", { name: "Stage 1: task completion" }).click();
  await expect(page.locator("#panel-title")).toHaveText(
    "A clear winner. On paper.",
  );
});

test("desktop scrolling advances the evidence panel", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Mobile uses a linear story with explicit controls");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const index of [0, 1, 2]) {
    await page.locator(`[data-step="${index}"]`).evaluate((element) => {
      element.scrollIntoView({ block: "center", behavior: "instant" });
    });
    await expect(page.locator(".evidence-panel")).toHaveAttribute(
      "data-stage",
      String(index),
    );
  }
});

test("evidence panel stays inside a short laptop viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator('[data-step="1"]').evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  const bounds = await page.locator(".evidence-panel").boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768);
});

test("slider works with keyboard and exposes the assumptions", async ({
  page,
}) => {
  const slider = page.getByRole("slider", {
    name: "Your estimated cost of one critical error",
  });
  await slider.focus();
  await page.keyboard.press("Home");
  await expect(page.locator("#cost-a")).toHaveText("€400");
  await expect(page.locator("#cost-b")).toHaveText("€1,180");
  await expect(page.locator("#model-verdict")).toContainText("Agent A");
  await page.keyboard.press("End");
  await expect(page.locator("#error-cost-value")).toHaveText("€1,000");
  await expect(page.locator("#cost-a")).toHaveText("€20,400");
  await expect(page.locator("#cost-b")).toHaveText("€3,180");
  await expect(page.locator("#model-verdict")).toContainText("Agent B");
  await page.getByText("Inspect the calculation", { exact: true }).click();
  await expect(page.getByText("A = €200", { exact: false })).toBeVisible();
});

test("pilot dialog validates, traps focus, closes with Escape and restores focus", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Scope a pilot" });
  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("This opens a public GitHub issue", { exact: false }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Review enquiry on GitHub" })
    .click();
  expect(await dialog.locator("input:invalid, textarea:invalid").count()).toBe(
    2,
  );
  for (let index = 0; index < 9; index++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("dialog")),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test("pilot enquiry is encoded safely and handed off without pretending to save data", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Scope a pilot" }).click();
  const workflow = "Support & refunds <example>";
  await page.getByLabel("Workflow to evaluate").fill(workflow);
  await page
    .getByLabel("What would you like the evidence to help you decide?")
    .fill("Compare two configurations before deployment.");
  let handoff: URL | undefined;
  await page.route(
    "https://github.com/paolo-aliprandi/agent-decision-intelligence/issues/new?**",
    async (route) => {
      handoff = new URL(route.request().url());
      await route.fulfill({
        contentType: "text/html",
        body: "<title>GitHub handoff</title>",
      });
    },
  );
  await page.getByRole("button", { name: "Review enquiry on GitHub" }).click();
  await expect(page).toHaveTitle("GitHub handoff");
  expect(handoff?.searchParams.get("title")).toBe(`Pilot enquiry: ${workflow}`);
  expect(handoff?.searchParams.get("body")).toContain(
    "Compare two configurations before deployment.",
  );
  expect(handoff?.searchParams.get("body")).toContain("2 candidates");
});

test("navigation reaches the real sections and mobile menu closes", async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (isMobile) {
    const toggle = page.getByRole("button", { name: "Menu" });
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Our approach" })
      .click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  } else {
    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Our approach" })
      .click();
  }
  await expect(page).toHaveURL(/#method$/);
  await expect(
    page.getByRole("heading", { name: /Your real work.*A common test/ }),
  ).toBeInViewport();
});

test("page and pilot dialog pass automated WCAG AA accessibility checks", async ({
  page,
}) => {
  const pageResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(pageResults.violations).toEqual([]);
  await page.getByRole("button", { name: "Scope a pilot" }).click();
  const dialogResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(dialogResults.violations).toEqual([]);
});

test("reduced motion disables the illustration animation and smooth scrolling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".flow-path")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  expect(
    await page
      .locator("html")
      .evaluate((element) => getComputedStyle(element).scrollBehavior),
  ).toBe("auto");
});

test("core story and enquiry remain available without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJSPage = await context.newPage();
  await noJSPage.goto(baseURL!);
  await expect(noJSPage.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    noJSPage.getByRole("heading", { name: "Not all failures cost the same." }),
  ).toBeVisible();
  await expect(
    noJSPage.getByRole("link", {
      name: "Open a public pilot enquiry on GitHub.",
      exact: false,
    }),
  ).toBeAttached();
  await context.close();
});
