import path from "node:path";

/**
 * Resolve the workspace root directory.
 * Defaults to `./workspace` relative to CWD, overridable via
 * the `SVG_MCP_WORKSPACE` environment variable.
 */
export function resolveWorkspaceRoot(): string {
  if (process.env.SVG_MCP_WORKSPACE) {
    return path.resolve(process.env.SVG_MCP_WORKSPACE);
  }
  return path.resolve(process.cwd(), "workspace");
}

/**
 * Get the directory for a specific document.
 */
export function getDocumentDir(
  workspaceRoot: string,
  documentId: string,
): string {
  return path.join(workspaceRoot, "documents", documentId);
}

/**
 * Get the path to a document's JSON state file.
 */
export function getDocumentJsonPath(
  workspaceRoot: string,
  documentId: string,
): string {
  return path.join(getDocumentDir(workspaceRoot, documentId), "document.json");
}

/**
 * Get the path to a document's exported SVG file.
 */
export function getDocumentSvgPath(
  workspaceRoot: string,
  documentId: string,
): string {
  return path.join(getDocumentDir(workspaceRoot, documentId), "current.svg");
}

/**
 * Get the path to a document's preview PNG.
 */
export function getPreviewPath(
  workspaceRoot: string,
  documentId: string,
): string {
  return path.join(getDocumentDir(workspaceRoot, documentId), "preview.png");
}

/**
 * Get the snapshots directory for a document.
 */
export function getSnapshotsDir(
  workspaceRoot: string,
  documentId: string,
): string {
  return path.join(getDocumentDir(workspaceRoot, documentId), "snapshots");
}

/**
 * Get the exports directory.
 */
export function getExportsDir(workspaceRoot: string): string {
  return path.join(workspaceRoot, "exports");
}
