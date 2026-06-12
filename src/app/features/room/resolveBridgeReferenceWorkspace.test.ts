import { describe, expect, it } from 'vitest';
import { resolveBridgeReferenceWorkspace } from './resolveBridgeReferenceWorkspace';
import type { WorkspaceItem } from './WorkspacesModal';

const bridgeWorkspace = (id: string): WorkspaceItem => ({
  id,
  name: id,
  bridge_provider: 'coding-agent-bridge',
});

const regularWorkspace = (id: string): WorkspaceItem => ({
  id,
  name: id,
});

describe('resolveBridgeReferenceWorkspace', () => {
  it('resolves a bridge workspace by id', () => {
    const target = bridgeWorkspace('workspace-1');
    expect(
      resolveBridgeReferenceWorkspace([regularWorkspace('workspace-1'), target], 'workspace-1'),
    ).toBe(target);
  });

  it('does not resolve a non-bridge workspace by id', () => {
    expect(resolveBridgeReferenceWorkspace([regularWorkspace('workspace-1')], 'workspace-1')).toBe(
      undefined,
    );
  });

  it('falls back to the only bridge workspace when no id is provided', () => {
    const target = bridgeWorkspace('workspace-1');
    expect(resolveBridgeReferenceWorkspace([regularWorkspace('workspace-2'), target])).toBe(target);
  });

  it('does not guess when multiple bridge workspaces exist', () => {
    expect(
      resolveBridgeReferenceWorkspace([
        bridgeWorkspace('workspace-1'),
        bridgeWorkspace('workspace-2'),
      ]),
    ).toBe(undefined);
  });
});
