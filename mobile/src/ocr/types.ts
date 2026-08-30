export type OcrOutcome =
  | { available: false }
  | { available: true; text: string; confidence: number };
