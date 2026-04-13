/** Mask API keys for display (never send full secrets to the client). */
export function maskApiKey(secret: string | undefined | null): { masked: string; configured: boolean } {
  const s = secret?.trim();
  if (!s) return { masked: "", configured: false };
  if (s.length <= 4) return { masked: "••••••••", configured: true };
  return { masked: `••••••••${s.slice(-4)}`, configured: true };
}
