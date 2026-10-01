import { describe, expect, it } from 'vitest';
import { createTestStores } from '../store/testing';
import { applyTheme, bindTheme } from './theme';

describe('applyTheme', () => {
  it('sets data-theme for an explicit choice', () => {
    const root = document.createElement('html');
    applyTheme('dark', root);
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyTheme('light', root);
    expect(root.getAttribute('data-theme')).toBe('light');
  });

  it('goes dark for system in the evening, and only then', () => {
    const root = document.createElement('html');
    applyTheme('system', root, { evening: true });
    expect(root.getAttribute('data-theme')).toBe('dark');
    applyTheme('light', root, { evening: true });
    expect(root.getAttribute('data-theme')).toBe('light');
    applyTheme('system', root, { evening: false });
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  it('removes data-theme for system so the media query decides', () => {
    const root = document.createElement('html');
    root.setAttribute('data-theme', 'dark');
    applyTheme('system', root);
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});

describe('bindTheme', () => {
  it('applies the stored preference immediately and follows changes until unsubscribed', () => {
    const stores = createTestStores();
    stores.preferences.save({ theme: 'dark' });
    const root = document.createElement('html');

    const unbind = bindTheme(stores.preferences, root);
    expect(root.getAttribute('data-theme')).toBe('dark');

    stores.preferences.save({ theme: 'light' });
    expect(root.getAttribute('data-theme')).toBe('light');

    stores.preferences.save({ theme: 'system' });
    expect(root.hasAttribute('data-theme')).toBe(false);

    unbind();
    stores.preferences.save({ theme: 'dark' });
    expect(root.hasAttribute('data-theme')).toBe(false);
  });
});
