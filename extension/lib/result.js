import { analyzePolicy } from "./rules.js";
import { buildGuidance } from "./templates.js";

/**
 * Turn cleaned policy text into the result shape the popup and web demo render.
 * @param {string} text
 * @param {{ domain: string, policyUrl?: string|null, pageUrl?: string|null, pageLinks?: { href: string, text: string }[] }} ctx
 */
export function buildAnalysisResult(text, ctx) {
  const policyUrl = ctx.policyUrl || null;
  const analysis = analyzePolicy(text, {
    policyUrl: policyUrl || undefined,
    pageLinks: ctx.pageLinks || []
  });
  if (!analysis.actions.policyUrl) analysis.actions.policyUrl = policyUrl;

  return {
    domain: ctx.domain,
    pageUrl: ctx.pageUrl || policyUrl,
    policyUrl,
    findings: analysis.findings,
    actions: analysis.actions,
    guidance: buildGuidance(analysis.findings),
    alertCount: analysis.alertCount,
    analyzedAt: new Date().toISOString()
  };
}
