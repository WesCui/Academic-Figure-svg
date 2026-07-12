import { randomUUID } from "node:crypto";

/**
 * Generate a document ID with a prefix.
 */
export function generateDocumentId(): string {
  return `doc_${randomUUID()}`;
}

/**
 * Generate an element ID with a prefix.
 */
export function generateElementId(): string {
  return `el_${randomUUID()}`;
}

/**
 * Generate a snapshot ID from a revision number.
 */
export function snapshotId(revision: number): string {
  return String(revision).padStart(6, "0");
}
