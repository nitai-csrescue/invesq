import Anthropic from "@anthropic-ai/sdk";
import { logger } from "./logger.js";

// Direct Anthropic API access using the operator's own ANTHROPIC_API_KEY —
// intentionally NOT the Replit AI Integrations proxy. Callers must handle a
// null return (key not configured) gracefully instead of crashing.
export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY not set — cannot run AI-backed job");
    return null;
  }
  return new Anthropic({ apiKey });
}
