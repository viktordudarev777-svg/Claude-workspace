import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  /** The analysis is looked up in the in-memory cache, then in history. */
  Result: { scanId: string };
  AdditiveDetail: { code: string };
};

export type TabParamList = {
  Scan: undefined;
  History: undefined;
  Additives: undefined;
  Settings: undefined;
};

export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
