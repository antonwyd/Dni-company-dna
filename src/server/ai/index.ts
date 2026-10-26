import "server-only";
import type { AIProvider } from "./provider";
import { MockAIProvider } from "./mock-provider";

let instance: AIProvider | null = null;

/**
 * Returns the configured AI provider.
 *
 * Only the mock provider exists in Phase 0–1. A real provider (for example
 * Claude) will be added behind the same interface and is refused unless
 * DNI_ALLOW_EXTERNAL_AI=true, so company data cannot reach an external model
 * by accident.
 */
export function getAIProvider(): AIProvider {
  if (instance) return instance;
  const configured = process.env.DNI_AI_PROVIDER ?? "mock";
  if (configured !== "mock") {
    if (process.env.DNI_ALLOW_EXTERNAL_AI !== "true") {
      throw new Error(`AI provider "${configured}" is external and DNI_ALLOW_EXTERNAL_AI is not "true". Refusing to start.`);
    }
    throw new Error(`AI provider "${configured}" is not implemented yet. Use DNI_AI_PROVIDER=mock.`);
  }
  instance = new MockAIProvider();
  return instance;
}
