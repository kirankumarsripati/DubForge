const NETWORK_DELAY_MS = 600;

export function delay(ms: number = NETWORK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function randomId(): string {
  return crypto.randomUUID();
}
