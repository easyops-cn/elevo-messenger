import { describe, expect, it } from 'vitest';
import { canViewFullFile } from './canViewFullFile';
import { UNKNOWN_FILE } from '../message/elevo/diffSummary';

describe('canViewFullFile', () => {
  it('allows relative paths', () => {
    expect(canViewFullFile('src/index.ts')).toBe(true);
    expect(canViewFullFile('a/b/c.txt')).toBe(true);
    expect(canViewFullFile('README.md')).toBe(true);
  });

  it('allows absolute paths under workspace mount prefixes', () => {
    expect(canViewFullFile('/workspaces/a')).toBe(true);
    expect(canViewFullFile('/workspaces/project/src/main.rs')).toBe(true);
    expect(canViewFullFile('/workspace/a')).toBe(true);
    expect(canViewFullFile('/workspace/repo/file.ts')).toBe(true);
  });

  it('hides other absolute paths', () => {
    expect(canViewFullFile('/etc/passwd')).toBe(false);
    expect(canViewFullFile('/home/user/file.txt')).toBe(false);
    expect(canViewFullFile('/tmp/x')).toBe(false);
  });

  it('does not treat lookalike prefixes as workspace mounts', () => {
    expect(canViewFullFile('/workspaceX/a')).toBe(false);
    expect(canViewFullFile('/workspacesX/a')).toBe(false);
    expect(canViewFullFile('/workspaceshere')).toBe(false);
  });

  it('hides unknown files and empty paths', () => {
    expect(canViewFullFile(UNKNOWN_FILE)).toBe(false);
    expect(canViewFullFile('')).toBe(false);
  });
});
