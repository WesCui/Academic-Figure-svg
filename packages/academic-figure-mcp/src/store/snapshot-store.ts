/**
 * Revision snapshot store for undo/rollback support.
 *
 * Snapshots are stored as numbered JSON files inside a document's snapshots/ directory.
 * The snapshot file name is the zero-padded revision number (e.g. "000042.json").
 *
 * @module snapshot-store
 */

import { promises as fs } from "node:fs";

import type { SvgDocument } from "@academic-figure/core";
import { getSnapshotsDir } from "../utils/paths.js";
import { snapshotId } from "../utils/ids.js";

export interface SnapshotStore {
  /** Save a snapshot of the document at its current revision. */
  save(workspaceRoot: string, document: SvgDocument): Promise<void>;

  /** Load a snapshot by revision number. */
  load(
    workspaceRoot: string,
    documentId: string,
    revision: number,
  ): Promise<SvgDocument>;

  /** List available snapshot revision numbers for a document. */
  list(workspaceRoot: string, documentId: string): Promise<number[]>;

  /** Delete all snapshots for a document. */
  clear(workspaceRoot: string, documentId: string): Promise<void>;
}

export class FileSnapshotStore implements SnapshotStore {
  public async save(
    workspaceRoot: string,
    document: SvgDocument,
  ): Promise<void> {
    const dir = getSnapshotsDir(workspaceRoot, document.id);
    await fs.mkdir(dir, { recursive: true });
    const filePath = `${dir}/${snapshotId(document.revision)}.json`;
    await fs.writeFile(filePath, JSON.stringify(document, null, 2), "utf8");
  }

  public async load(
    workspaceRoot: string,
    documentId: string,
    revision: number,
  ): Promise<SvgDocument> {
    const dir = getSnapshotsDir(workspaceRoot, documentId);
    const filePath = `${dir}/${snapshotId(revision)}.json`;
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as SvgDocument;
  }

  public async list(
    workspaceRoot: string,
    documentId: string,
  ): Promise<number[]> {
    const dir = getSnapshotsDir(workspaceRoot, documentId);
    try {
      const entries = await fs.readdir(dir);
      return entries
        .filter((f) => f.endsWith(".json"))
        .map((f) => parseInt(f.replace(".json", ""), 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
    } catch {
      return [];
    }
  }

  public async clear(
    workspaceRoot: string,
    documentId: string,
  ): Promise<void> {
    const dir = getSnapshotsDir(workspaceRoot, documentId);
    try {
      await fs.rm(dir, { recursive: true, force: true });
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory may not exist — that's fine
    }
  }
}
