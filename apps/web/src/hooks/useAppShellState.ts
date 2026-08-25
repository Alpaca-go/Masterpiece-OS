import { useState } from 'react';
import type {
  ImageGenerationSourceBundle,
  PublicSettings
} from '@masterpiece/runtime-core/application-contracts.ts';
import type { Screen } from '../lib/useUrlScreen';

/**
 * Owns the cross-cutting App shell state: loaded settings + the splash
 * loading flag + the screen to return to after closing Settings + the
 * pending ImageGeneration source bundle (preload before navigation).
 */
export interface UseAppShellStateResult {
  settings: PublicSettings | null;
  setSettings: React.Dispatch<React.SetStateAction<PublicSettings | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  settingsReturnScreen: Screen;
  setSettingsReturnScreen: React.Dispatch<React.SetStateAction<Screen>>;
  requestedImageGen: ImageGenerationSourceBundle | null;
  setRequestedImageGen: React.Dispatch<React.SetStateAction<ImageGenerationSourceBundle | null>>;
}

export function useAppShellState(): UseAppShellStateResult {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsReturnScreen, setSettingsReturnScreen] = useState<Screen>('home');
  const [requestedImageGen, setRequestedImageGen] = useState<ImageGenerationSourceBundle | null>(null);

  return {
    settings,
    setSettings,
    loading,
    setLoading,
    settingsReturnScreen,
    setSettingsReturnScreen,
    requestedImageGen,
    setRequestedImageGen,
  };
}
