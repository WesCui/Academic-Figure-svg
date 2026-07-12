/**
 * Structured error types for the MCP server.
 */

export class DocumentNotFoundError extends Error {
  public readonly code = "DOCUMENT_NOT_FOUND" as const;

  constructor(documentId: string) {
    super(`SVG document not found: ${documentId}`);
    this.name = "DocumentNotFoundError";
  }
}

export class ElementNotFoundError extends Error {
  public readonly code = "ELEMENT_NOT_FOUND" as const;

  constructor(elementId: string) {
    super(`SVG element not found: ${elementId}`);
    this.name = "ElementNotFoundError";
  }
}

export class RevisionConflictError extends Error {
  public readonly code = "REVISION_CONFLICT" as const;

  constructor(
    public readonly currentRevision: number,
    public readonly expectedRevision: number,
  ) {
    super(
      `Revision conflict: expected ${expectedRevision}, current ${currentRevision}`,
    );
    this.name = "RevisionConflictError";
  }
}

export class InvalidElementError extends Error {
  public readonly code = "INVALID_ELEMENT" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvalidElementError";
  }
}

/**
 * Map a known error to a user-facing JSON string.
 */
export function errorToJson(error: unknown): string {
  if (error instanceof DocumentNotFoundError) {
    return JSON.stringify({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof ElementNotFoundError) {
    return JSON.stringify({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof RevisionConflictError) {
    return JSON.stringify({
      error: error.code,
      currentRevision: error.currentRevision,
      expectedRevision: error.expectedRevision,
      message: error.message,
    });
  }

  if (error instanceof InvalidElementError) {
    return JSON.stringify({
      error: error.code,
      message: error.message,
    });
  }

  if (error instanceof Error) {
    return JSON.stringify({
      error: "INTERNAL_ERROR",
      message: error.message,
    });
  }

  return JSON.stringify({
    error: "INTERNAL_ERROR",
    message: String(error),
  });
}
