/**
 * Structured error types for the MCP server.
 *
 * All errors serialize to a uniform JSON shape:
 *   { success: false, code: string, message: string, ...details }
 *
 * @module errors
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
      `Document revision mismatch: expected ${expectedRevision}, current ${currentRevision}`,
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

// ---------------------------------------------------------------------------
// Unified error serialization
// ---------------------------------------------------------------------------

export interface SerializedError {
  success: false;
  code: string;
  message: string;
  expectedRevision?: number;
  currentRevision?: number;
}

/**
 * Map a known error to a structured JSON object.
 * The return value matches the unified ToolError shape from the review spec.
 */
export function errorToJson(error: unknown): string {
  let serialized: SerializedError;

  if (error instanceof RevisionConflictError) {
    serialized = {
      success: false,
      code: error.code,
      message: error.message,
      expectedRevision: error.expectedRevision,
      currentRevision: error.currentRevision,
    };
  } else if (error instanceof DocumentNotFoundError) {
    serialized = {
      success: false,
      code: error.code,
      message: error.message,
    };
  } else if (error instanceof ElementNotFoundError) {
    serialized = {
      success: false,
      code: error.code,
      message: error.message,
    };
  } else if (error instanceof InvalidElementError) {
    serialized = {
      success: false,
      code: error.code,
      message: error.message,
    };
  } else if (error instanceof Error) {
    serialized = {
      success: false,
      code: "INTERNAL_ERROR",
      message: error.message,
    };
  } else {
    serialized = {
      success: false,
      code: "INTERNAL_ERROR",
      message: String(error),
    };
  }

  return JSON.stringify(serialized, null, 2);
}
