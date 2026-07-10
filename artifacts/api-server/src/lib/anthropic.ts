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

export function isTextBlock(block: Anthropic.Messages.ContentBlock): block is Anthropic.Messages.TextBlock {
  return block.type === "text";
}

export function extractText(message: Anthropic.Messages.Message): string {
  return message.content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join("\n");
}

// Pulls the JSON payload out of a Claude response that was instructed to
// respond with a single fenced ```json code block (optionally preceded by
// prose, e.g. web-search narration). Falls back to the raw text if no fence
// is present.
export function extractJsonFence(text: string): string {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
  return (fenceMatch ? fenceMatch[1] : text).trim();
}
