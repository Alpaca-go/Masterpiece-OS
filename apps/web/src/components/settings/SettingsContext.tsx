import type {
  ApiProfile,
  ConnectionTestResult,
  ModelRegistryEntry,
  PublicSettings,
  SaveApiProfileInput,
  SaveSettingsInput,
} from '@masterpiece/runtime-core/application-contracts.ts';

/**
 * Settings 共享上下文：把 SettingsPanel 的所有 state + 回调打包成一个
 * context value，让各 section 子组件通过 useSettingsContext() 获取。
 * 零业务逻辑改动——只是把 inline 闭包+state 提到模块层以便拆文件。
 */
export interface SettingsContextValue {
  // Data
  settings: PublicSettings;
  registry: ModelRegistryEntry[];

  // Form state
  localForm: SaveSettingsInput;
  editor: SaveApiProfileInput | null;
  showKey: boolean;
  busy: string;
  notice: {
    tone: 'ok' | 'error';
    text: string;
    connectionResult?: ConnectionTestResult;
  } | null;

  // Form mutations
  updateLocal: <K extends keyof SaveSettingsInput>(key: K, value: SaveSettingsInput[K]) => void;
  updateProfile: <K extends keyof SaveApiProfileInput>(key: K, value: SaveApiProfileInput[K]) => void;
  selectRegistryModel: (registryModelId: string) => void;
  setShowKey: (v: boolean) => void;
  setEditor: (e: SaveApiProfileInput | null) => void;

  // Actions
  perform: (key: string, action: () => Promise<PublicSettings>, message: string) => Promise<PublicSettings | null>;
  testProfile: (input: SaveApiProfileInput, busyKey: string) => Promise<void>;
  saveProfile: () => Promise<void>;
  saveLocal: () => Promise<void>;
  removeProfile: (profile: ApiProfile) => Promise<void>;
  startAddProfile: () => void;
  startEditProfile: (profile: ApiProfile) => void;
}

import { createContext, useContext } from 'react';

export const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used inside <SettingsContext.Provider>');
  return ctx;
}
