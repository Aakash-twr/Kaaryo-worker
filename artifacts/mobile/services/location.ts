import * as Location from "expo-location";
import { Platform } from "react-native";

export interface Coords {
  lat: number;
  lng: number;
}

/**
 * Ask for foreground location permission. Returns true if granted. On web the
 * browser prompts on first `getCurrentPositionAsync`, so we optimistically
 * return true and let the position call surface any denial.
 */
export async function ensureLocationPermission(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === "granted";
}

/** Fetch a single high-accuracy fix. Throws if location is unavailable. */
export async function getCurrentCoords(): Promise<Coords> {
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}
