/**
 * A translatable message: a translation key plus interpolation values.
 *
 * Execution snapshots store descriptors, never rendered strings, so the UI
 * language can change at any time without recomputing or resetting execution.
 */
export interface MessageDescriptor {
  readonly key: string;
  readonly values?: Readonly<Record<string, string | number>>;
}
