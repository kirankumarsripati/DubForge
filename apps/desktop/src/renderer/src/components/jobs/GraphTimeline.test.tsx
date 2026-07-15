import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { WorkflowTimelineNode } from '@dubforge/types';
import { GraphTimeline } from './GraphTimeline';

const timeline: WorkflowTimelineNode[] = [
  {
    id: 'validate',
    kind: 'validate',
    label: 'Validate',
    status: 'completed',
    progress: 100,
    dependencies: [],
    startedAt: '2026-07-15T10:00:00.000Z',
    completedAt: '2026-07-15T10:00:01.000Z',
    durationMs: 1000,
    languageCode: null,
    layer: 0,
  },
  {
    id: 'translate:hi',
    kind: 'translate',
    label: 'Translate (hi)',
    status: 'running',
    progress: 45,
    dependencies: ['validate'],
    startedAt: '2026-07-15T10:00:02.000Z',
    completedAt: null,
    durationMs: null,
    languageCode: 'hi',
    layer: 2,
  },
];

describe('GraphTimeline', () => {
  it('renders layered workflow nodes', () => {
    render(<GraphTimeline timeline={timeline} />);

    expect(screen.getByText('Workflow Timeline')).toBeInTheDocument();
    expect(screen.getByText('Validate')).toBeInTheDocument();
    expect(screen.getByText('Translate (hi)')).toBeInTheDocument();
    expect(screen.getByText('Layer 1')).toBeInTheDocument();
    expect(screen.getByText('Layer 3')).toBeInTheDocument();
  });
});
