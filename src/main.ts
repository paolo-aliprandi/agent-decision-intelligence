import "./style.css";
import { calculateCostComparison, formatCurrency } from "./model";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element)
    throw new Error(`Required page element is missing: ${selector}`);
  return element;
}

const themeToggle = required<HTMLButtonElement>(".theme-toggle");
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
let followsSystemTheme = !document.documentElement.hasAttribute("data-theme");

function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  themeToggle.title = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
  required<HTMLMetaElement>('meta[name="theme-color"]').content =
    theme === "dark" ? "#09090b" : "#ffffff";
}

applyTheme(
  document.documentElement.dataset.theme === "dark" ||
    (followsSystemTheme && systemTheme.matches)
    ? "dark"
    : "light",
);
themeToggle.hidden = false;
themeToggle.addEventListener("click", () => {
  const theme =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  followsSystemTheme = false;
  applyTheme(theme);
  try {
    localStorage.setItem("adi-theme", theme);
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    console.warn("Unable to save theme preference:", error.name);
  }
});
systemTheme.addEventListener("change", (event) => {
  if (followsSystemTheme) applyTheme(event.matches ? "dark" : "light");
});

const menuToggle = required<HTMLButtonElement>(".menu-toggle");
const mobileNav = required<HTMLElement>("#mobile-nav");
function closeMenu() {
  menuToggle.setAttribute("aria-expanded", "false");
  mobileNav.hidden = true;
}
menuToggle.addEventListener("click", () => {
  const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isExpanded));
  mobileNav.hidden = isExpanded;
});
mobileNav
  .querySelectorAll("a")
  .forEach((link) => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menuToggle.focus();
  }
});
window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
  if (event.matches) closeMenu();
});

const panel = required<HTMLElement>(".evidence-panel");
const stageButtons = document.querySelectorAll<HTMLButtonElement>(
  "[data-stage-button]",
);
const storySteps = document.querySelectorAll<HTMLElement>(".story-step");
const stages = [
  {
    title: "A clear winner. On paper.",
    subtitle: "Task completion on 1,000 illustrative cases",
    label: "The first impression",
    conclusion: "Agent A completes more tasks. But what does it get wrong?",
  },
  {
    title: "The average hides the stakes.",
    subtitle: "Same cases. A closer look at the failures.",
    label: "The missing context",
    conclusion:
      "Agent A makes 20 critical errors. Agent B makes 2. The errors are not equal.",
  },
  {
    title: "A decision, not a leaderboard.",
    subtitle: "An illustrative deployment policy, not a safety claim",
    label: "The decision",
    conclusion:
      "Consider B for lower-risk cases. Require review for consequential actions. Validate before deployment.",
  },
];

function setStage(index: number) {
  const stage = stages[index];
  if (!stage) throw new Error(`Unknown story stage: ${index}`);
  panel.dataset.stage = String(index);
  required<HTMLElement>("#panel-title").textContent = stage.title;
  required<HTMLElement>("#panel-subtitle").textContent = stage.subtitle;
  required<HTMLElement>("#conclusion-label").textContent = stage.label;
  required<HTMLElement>("#conclusion-text").textContent = stage.conclusion;
  stageButtons.forEach((button, buttonIndex) => {
    button.setAttribute("aria-pressed", String(index === buttonIndex));
  });
  storySteps.forEach((step, stepIndex) => {
    step.classList.toggle("is-active", index === stepIndex);
  });
}
stageButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    setStage(index);
    if (desktopStory.matches) {
      storySteps[index]?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
    }
  });
});

// On narrow screens the story is linear; explicit controls keep every stage reachable.
const desktopStory = window.matchMedia("(min-width: 761px)");
const storyObserver = new IntersectionObserver(
  (entries) => {
    if (!desktopStory.matches) return;
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) {
      const index = Array.from(storySteps).indexOf(
        visible.target as HTMLElement,
      );
      setStage(index);
    }
  },
  { rootMargin: "-28% 0px -38% 0px", threshold: [0, 0.2, 0.5] },
);
storySteps.forEach((step) => storyObserver.observe(step));

const errorCost = required<HTMLInputElement>("#error-cost");
function updateModel() {
  const loss = Number(errorCost.value);
  const comparison = calculateCostComparison(loss);
  required<HTMLOutputElement>("#error-cost-value").value = formatCurrency(loss);
  errorCost.setAttribute(
    "aria-valuetext",
    `${formatCurrency(loss)} per critical error`,
  );
  required<HTMLElement>("#cost-a").textContent = formatCurrency(
    comparison.agentA,
  );
  required<HTMLElement>("#cost-b").textContent = formatCurrency(
    comparison.agentB,
  );
  required<HTMLElement>("#cost-agent-a").classList.toggle(
    "is-preferred",
    comparison.preferred === "A",
  );
  required<HTMLElement>("#cost-agent-b").classList.toggle(
    "is-preferred",
    comparison.preferred === "B",
  );
  const verdict = required<HTMLElement>("#model-verdict");
  if (comparison.preferred === "tie") {
    verdict.textContent =
      "Equal modeled cost. Other constraints, uncertainty, and oversight still matter.";
  } else {
    verdict.textContent = `Agent ${comparison.preferred} has ${formatCurrency(comparison.difference)} lower modeled cost per 1,000 tasks under these assumptions.`;
  }
}
errorCost.addEventListener("input", updateModel);
updateModel();

const dialog = required<HTMLDialogElement>("#pilot-dialog");
let dialogTrigger: HTMLElement | null = null;
document
  .querySelectorAll<HTMLButtonElement>("[data-open-pilot]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      dialogTrigger = button;
      dialog.showModal();
    });
  });
required<HTMLButtonElement>("[data-close-pilot]").addEventListener(
  "click",
  () => dialog.close(),
);
dialog.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    dialog.close();
});
dialog.addEventListener("close", () => dialogTrigger?.focus());
dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  const controls = dialog.querySelectorAll<HTMLElement>(
    "button, input, select, textarea, a[href]",
  );
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});

const pilotForm = required<HTMLFormElement>("#pilot-form");
pilotForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!pilotForm.reportValidity()) return;
  const workflow = required<HTMLInputElement>("#workflow").value.trim();
  const decision = required<HTMLTextAreaElement>("#decision").value.trim();
  if (!workflow || !decision) {
    required<HTMLElement>("#form-status").textContent =
      "Please describe your workflow and decision using more than whitespace.";
    return;
  }
  const agents = required<HTMLSelectElement>("#agents").value;
  const body = [
    "## Evaluation pilot enquiry",
    `**Workflow:** ${workflow}`,
    `**Candidate agents or configurations:** ${agents}`,
    "### Decision to inform",
    decision,
    "---",
    "Submitted from the ADI landing page. No confidential data should be included.",
  ].join("\n\n");
  const url = new URL(
    "https://github.com/paolo-aliprandi/agent-decision-intelligence/issues/new",
  );
  url.searchParams.set("title", `Pilot enquiry: ${workflow}`);
  url.searchParams.set("body", body);
  // A same-tab handoff avoids popup blockers and never implies that a lead was saved.
  window.location.assign(url);
});
