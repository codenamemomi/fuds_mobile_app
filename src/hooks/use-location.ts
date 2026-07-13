/**
 * useLocation — reusable GPS + reverse-geocode helper for FUDS delivery address.
 *
 * UX contract: reverse geocoding is a *starting point* only. Nigerian addresses
 * (estate gates, landmarks, building numbers) are often wrong — always let the
 * caller put the string into an editable field before saving.
 */

import { useCallback, useRef, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Location from 'expo-location';

export type LocationCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

export type ResolvedLocation = {
  /** Human-readable suggestion for an editable address field (never auto-save this). */
  suggestedAddress: string;
  coords: LocationCoords;
  /** Raw reverse-geocode result for debugging / future map pin. */
  place: Location.LocationGeocodedAddress | null;
};

export type UseLocationResult = {
  /** True while requesting permission / GPS / reverse geocode. */
  isLocating: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Last successful resolve (does not replace user edits). */
  lastResolved: ResolvedLocation | null;
  /**
   * Request permission (if needed), read current position, reverse-geocode.
   * Returns a suggested address string — caller must put it in editable state.
   */
  getCurrentAddress: () => Promise<ResolvedLocation | null>;
  /** Clear last error. */
  clearError: () => void;
};

function formatNigerianAddress(place: Location.LocationGeocodedAddress): string {
  // Prefer street-level parts; fall back to name / district / city.
  // Order tuned for Lagos-style delivery instructions.
  const streetLine = [place.streetNumber, place.street].filter(Boolean).join(' ').trim();
  const parts = [
    streetLine || place.name || null,
    place.district || place.subregion || null,
    place.city || place.region || null,
  ].filter((p): p is string => !!p && p.trim().length > 0);

  // Deduplicate consecutive identical segments (geocoders often repeat area names)
  const unique: string[] = [];
  for (const part of parts) {
    const normalized = part.trim();
    if (
      unique.length === 0 ||
      unique[unique.length - 1].toLowerCase() !== normalized.toLowerCase()
    ) {
      unique.push(normalized);
    }
  }

  if (unique.length > 0) {
    return unique.join(', ');
  }

  // Last resort — still better than coordinates for a delivery field
  return [place.region, place.country].filter(Boolean).join(', ') || 'Current location';
}

async function ensureForegroundPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;

  if (!current.canAskAgain && current.status === Location.PermissionStatus.DENIED) {
    Alert.alert(
      'Location permission needed',
      'Enable location access in Settings so FUDS can suggest your delivery address. You can still type it manually.',
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            if (Platform.OS === 'ios') {
              Linking.openURL('app-settings:');
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
    return false;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

export function useLocation(): UseLocationResult {
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResolved, setLastResolved] = useState<ResolvedLocation | null>(null);
  const inflight = useRef(false);

  const clearError = useCallback(() => setError(null), []);

  const getCurrentAddress = useCallback(async (): Promise<ResolvedLocation | null> => {
    if (inflight.current) return null;
    inflight.current = true;
    setIsLocating(true);
    setError(null);

    try {
      const granted = await ensureForegroundPermission();
      if (!granted) {
        setError('Location permission denied. You can type your address instead.');
        return null;
      }

      // Balanced accuracy is enough for estate / street-level delivery suggestions
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords: LocationCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      };

      let place: Location.LocationGeocodedAddress | null = null;
      let suggestedAddress = `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;

      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coords.latitude,
          longitude: coords.longitude,
        });
        place = results[0] ?? null;
        if (place) {
          suggestedAddress = formatNigerianAddress(place);
        }
      } catch {
        // Reverse geocode can fail offline — still return coords as a weak suggestion
        setError('Could not resolve street name. Edit the address before saving.');
      }

      const resolved: ResolvedLocation = { suggestedAddress, coords, place };
      setLastResolved(resolved);
      return resolved;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not read your location. Type your address instead.';
      setError(message);
      return null;
    } finally {
      setIsLocating(false);
      inflight.current = false;
    }
  }, []);

  return {
    isLocating,
    error,
    lastResolved,
    getCurrentAddress,
    clearError,
  };
}
