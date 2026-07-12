#!/usr/bin/env node
/**
 * Register the Academic Figure MCP server with Claude Code (or any MCP client
 * that reads `claude mcp` user-scope config).
 *
 * What this does:
 *   1. Finds the repo root (parent of this `scripts/` dir).
 *   2. Checks that the `claude` CLI is on PATH.
 *   3. Builds the MCP server if `packages/academic-figure-mcp/dist/index.js`
 *      is missing (runs `npm install` + builds core & mcp packages).
 *   4. Registers the server in **user scope** (no UI approval needed) using the
 *      exact arg order that `claude mcp add` requires:
 *        node <abs server path>  MUST come right after the server name,
 *        BEFORE any `-e` flags — otherwise it errors with
 *        "missing required argument 'commandOrUrl'".
 *   5. Verifies with `claude mcp get academic-figure` → prints ✔ Connected.
 *
 * Usage:
 *   node scripts/register-mcp.mjs [--scope user|project] [--no-build] [--force]
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = join(repoRoot, 'packages', 'academic-figure-mcp', 'dist', 'index.js');
const workspace = join(repoRoot, 'workspace');
const SERVER_NAME = 'academic-figure';

// ---- parse flags -------------------------------------------------------
const args = process.argv.slice(2);
let scope = 'user';
let allowBuild = true;
let force = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--scope') scope = args[++i] || 'user';
  else if (args[i] === '--no-build') allowBuild = false;
  else if (args[i] === '--force') force = true;
}

// ---- helpers -----------------------------------------------------------
function log(msg) { console.log(`\n\x1b[36m[register-mcp]\x1b[0m ${msg}`); }
function ok(msg) { console.log(`\x1b[32m✔\x1b[0m ${msg}`); }
function warn(msg) { console.log(`\x1b[33m!\x1b[0m ${msg}`); }
function fail(msg) {
  console.error(`\x1b[31m✘ ${msg}\x1b[0m`);
  process.exit(1);
}

/** Run a command, inheriting stdio. Returns true on success. */
function run(cmd, cmdArgs, opts = {}) {
  const res = spawnSync(cmd, cmdArgs, { shell: true, stdio: 'inherit', ...opts });
  return res.status === 0;
}

/** Run `claude ...` returning trimmed stdout (or '' on failure). */
function claudeOut(cliArgs) {
  const res = spawnSync(`claude ${cliArgs}`, { shell: true, encoding: 'utf8' });
  return res.status === 0 ? (res.stdout || '').trim() : '';
}

function hasClaude() {
  const res = spawnSync('claude --version', { shell: true, encoding: 'utf8' });
  return res.status === 0;
}

function isRegistered() {
  const out = claudeOut(`mcp get ${SERVER_NAME}`);
  return out !== '' && !/not found|no server/i.test(out);
}

function buildIfNeeded() {
  if (existsSync(serverPath)) return;
  if (!allowBuild) fail(`MCP server not built (${serverPath} missing). Run the build steps in the README, or re-run without --no-build.`);

  log('MCP server not built yet — building now...');
  if (!existsSync(join(repoRoot, 'node_modules'))) {
    log('Installing dependencies (npm install)...');
    if (!run('npm', ['install'], { cwd: repoRoot })) fail('npm install failed.');
  }
  log('Building @academic-figure/core...');
  if (!run('npm', ['run', 'build'], { cwd: join(repoRoot, 'packages', 'academic-figure-core') })) fail('core build failed.');
  log('Building @academic-figure/mcp...');
  if (!run('npm', ['run', 'build'], { cwd: join(repoRoot, 'packages', 'academic-figure-mcp') })) fail('mcp build failed.');

  if (!existsSync(serverPath)) fail(`Build completed but ${serverPath} still missing.`);
  ok('MCP server built.');
}

function register() {
  // Double-quote paths because the default workspace path contains spaces.
  const addCmd =
    `claude mcp add --scope ${scope} ${SERVER_NAME} ` +
    `node "${serverPath}" ` +
    `-e "SVG_MCP_WORKSPACE=${workspace}" ` +
    `-e "SVG_MCP_HTTP_PORT=0"`;
  log(`Registering server (scope=${scope})...`);
  log(addCmd.replace(/-e "SVG_MCP_WORKSPACE=.*?"/, '-e "SVG_MCP_WORKSPACE=<workspace>"'));
  if (!run(addCmd)) fail('claude mcp add failed. See output above.');
  ok('Registration command finished.');
}

function verify() {
  log('Verifying connection...');
  const out = claudeOut(`mcp get ${SERVER_NAME}`);
  if (out === '') fail('Could not read server status after registration.');
  console.log(out);
  if (/connected/i.test(out)) ok('academic-figure is connected and ready to use in Claude Code.');
  else warn('Registered, but status is not "connected". Try `claude mcp get academic-figure` and check the logs.');
}

// ---- main --------------------------------------------------------------
function main() {
  log(`Repo root: ${repoRoot}`);
  if (!hasClaude()) {
    fail('The `claude` CLI was not found on PATH.\n  Install Claude Code, then re-run this script.\n  https://docs.claude.com/en/docs/claude-code');
  }

  if (isRegistered()) {
    if (force) {
      log('Already registered — --force set, re-registering...');
    } else {
      ok('academic-figure is already registered.');
      verify();
      return;
    }
  }

  buildIfNeeded();
  register();
  verify();
  console.log('\n\x1b[36m[register-mcp]\x1b[0m Done. In Claude Code, just ask it to draw a figure — e.g.\n' +
    '  "Draw an academic figure: two buildings, three UAVs communicating, a legend and numbered callouts, then export SVG and render PNG."');
}

main();
