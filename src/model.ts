export function calculateCostComparison(criticalErrorCost: number) {
  if (!Number.isFinite(criticalErrorCost) || criticalErrorCost < 0) {
    throw new RangeError(
      "Critical-error cost must be a finite, non-negative number.",
    );
  }
  // Synthetic, mutually exclusive outcomes per 1,000 attempted tasks:
  // A: 960 successful, 20 critical, 20 routine failures. B: 920 / 2 / 78.
  const agentA = 200 + 20 * 10 + 20 * criticalErrorCost;
  const agentB = 400 + 78 * 10 + 2 * criticalErrorCost;
  return {
    agentA,
    agentB,
    preferred: agentA === agentB ? "tie" : agentA < agentB ? "A" : "B",
    difference: Math.abs(agentA - agentB),
  } as const;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}
