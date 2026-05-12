export function generateTemporaryPassword(): string {
  const seed = crypto.randomUUID().replace(/-/g, "");
  return `${seed.slice(0, 6)}Aa!${seed.slice(6, 12)}`;
}

export function isStrongTemporaryPassword(value: string): boolean {
  return value.length >= 12 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
}