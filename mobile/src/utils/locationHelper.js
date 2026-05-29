import * as Location from 'expo-location';

/**
 * Request location permissions and get current position
 * @returns {Promise<{location: object|null, error: string|null}>}
 */
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { location: null, error: 'Location permission denied' };
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { latitude, longitude } = position.coords;

    // Reverse geocode to get address
    const [geocoded] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    const address = geocoded
      ? [geocoded.name, geocoded.street, geocoded.city, geocoded.region, geocoded.postalCode]
          .filter(Boolean)
          .join(', ')
      : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

    return {
      location: {
        lat: latitude,
        lng: longitude,
        address,
      },
      error: null,
    };
  } catch (error) {
    return { location: null, error: error.message };
  }
};

/**
 * Format a location object for display
 */
export const formatLocation = (location) => {
  if (!location) return 'No location';
  if (location.address) return location.address;
  if (location.lat && location.lng) {
    return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  }
  return 'Unknown location';
};

/**
 * Get general area from address (hides full address for privacy)
 */
export const getGeneralArea = (location) => {
  if (!location) return 'Unknown area';
  if (location.address) {
    const parts = location.address.split(',');
    // Return only city/region, not street-level detail
    return parts.length > 2 ? parts.slice(-2).join(',').trim() : parts[0].trim();
  }
  return 'Unknown area';
};
