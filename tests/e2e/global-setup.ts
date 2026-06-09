import { rmSync } from 'node:fs';

// Start every run from an empty database so the flow test is deterministic.
export default function globalSetup() {
  rmSync('./.e2e', { recursive: true, force: true });
}
