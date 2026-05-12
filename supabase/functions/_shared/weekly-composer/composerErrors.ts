/**
 * Typed errors for the Weekly Composer.
 * Composer NEVER throws untyped exceptions to callers — it returns
 * ComposeFail. These classes exist for internal flow and tests only.
 */

export class ComposerError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ComposerError";
  }
}

export class SlotPoolExhausted extends ComposerError {
  constructor(slotRole: string, attempted: string[]) {
    super(
      "POOL_EMPTY_AFTER_FILTER",
      `Slot pool exhausted for role="${slotRole}" after clinical filtering. Attempted: [${attempted.join(", ")}]`,
    );
    this.name = "SlotPoolExhausted";
  }
}

export class InvalidComposerInput extends ComposerError {
  constructor(code: string, message: string) {
    super(code, message);
    this.name = "InvalidComposerInput";
  }
}
