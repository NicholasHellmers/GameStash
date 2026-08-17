import { describe, it, expect } from 'vitest';
import * as MetadataModule from '../index';

describe('features/metadata barrel export', () => {
  it('exports OpenGameDbProvider, ScreenScraperProvider, CompositeMetadataProvider, useGameMetadata, and ManualMatchModal', () => {
    expect(MetadataModule.OpenGameDbProvider).toBeDefined();
    expect(MetadataModule.ScreenScraperProvider).toBeDefined();
    expect(MetadataModule.CompositeMetadataProvider).toBeDefined();
    expect(MetadataModule.defaultMetadataProvider).toBeDefined();
    expect(MetadataModule.useGameMetadata).toBeDefined();
    expect(MetadataModule.ManualMatchModal).toBeDefined();
  });
});
