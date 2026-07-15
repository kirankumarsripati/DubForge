import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANGUAGES, MOCK_VOICES } from '@dubforge/job-config';
import { VoiceSelectionCard } from './VoiceSelectionCard';

afterEach(() => {
  cleanup();
});

describe('VoiceSelectionCard', () => {
  it('renders voice selectors for enabled languages', () => {
    render(
      <VoiceSelectionCard
        languages={DEFAULT_LANGUAGES}
        voices={{ en: 'en-female-1', hi: 'hi-female-1', te: 'te-female-1' }}
        availableVoices={MOCK_VOICES}
        onVoiceChange={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Voice for English' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Voice for Hindi' })).toBeInTheDocument();
    expect(screen.getByLabelText('Preview voice for Hindi')).toBeInTheDocument();
  });

  it('calls onVoiceChange when a voice is selected', () => {
    const onVoiceChange = vi.fn();

    render(
      <VoiceSelectionCard
        languages={DEFAULT_LANGUAGES}
        voices={{ en: 'en-female-1', hi: 'hi-female-1', te: 'te-female-1' }}
        availableVoices={MOCK_VOICES}
        onVoiceChange={onVoiceChange}
      />,
    );

    const hindiSelect = screen.getByRole('combobox', { name: 'Voice for Hindi' });
    fireEvent.change(hindiSelect, { target: { value: 'hi-male-1' } });

    expect(onVoiceChange).toHaveBeenCalledWith('hi', 'hi-male-1');
  });
});
