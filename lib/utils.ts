import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to normalize document text - fix common OCR issues
export function normalizeDocumentText(text: string): string {
  // Fix missing spaces - look for camelCase or PascalCase patterns
  let normalizedText = text.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Fix missing spaces between words with capital letters
  normalizedText = normalizedText.replace(/([a-zA-Z])([A-Z][a-z])/g, "$1 $2");

  // Fix missing spaces after punctuation
  normalizedText = normalizedText.replace(/([.?!,;:])([a-zA-Z])/g, "$1 $2");

  // Fix missing spaces before and after brackets
  normalizedText = normalizedText.replace(/([a-zA-Z])(\[)/g, "$1 $2");
  normalizedText = normalizedText.replace(/(\])([a-zA-Z])/g, "$1 $2");

  // Fix missing spaces around hyphens between words
  normalizedText = normalizedText.replace(/([a-zA-Z])-([a-zA-Z])/g, "$1 - $2");

  // Remove excessive whitespace
  normalizedText = normalizedText.replace(/\s{2,}/g, " ");

  return normalizedText;
}
