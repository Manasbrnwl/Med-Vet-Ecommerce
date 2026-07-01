import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";

/** Non-sensitive persistence (cart, prefs). */
export const asyncStorage: StateStorage = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};

// SecureStore keys allow only [A-Za-z0-9._-]
const safe = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, "_");

/** Encrypted keychain storage for the JWT/session. */
export const secureStorage: StateStorage = {
  getItem: (k) => SecureStore.getItemAsync(safe(k)),
  setItem: (k, v) => SecureStore.setItemAsync(safe(k), v),
  removeItem: (k) => SecureStore.deleteItemAsync(safe(k)),
};
