import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Colors from '../../constants/colors';
import { getCollectionPoints } from '../../firebase/firestore';
import CollectionPointCard from '../../components/cards/CollectionPointCard';
import CapacityBar from '../../components/common/CapacityBar';
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from '../../components/common/ScreenStates';

let MapView = null;
let Marker = null;
try {
  const Maps = require('react-native-maps');
  Marker = Maps.Marker;
  try {
    const Clustering = require('react-native-map-clustering');
    MapView = Clustering.default;
  } catch (_err) {
    // Fallback to normal MapView if clustering is not available
    MapView = Maps.default;
  }
} catch (_e) {
  // react-native-maps not available
}

const CollectionPointsMapScreen = ({ route, navigation }) => {
  const { taskId } = route.params;

  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(!!MapView);

  useEffect(() => {
    const fetchPoints = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await getCollectionPoints();
        if (fetchError) {
          setError(fetchError);
        } else {
          setPoints(data || []);
        }
      } catch (err) {
        setError('Failed to load collection points.');
      } finally {
        setLoading(false);
      }
    };
    fetchPoints();
  }, []);

  const handleSelectPoint = (point) => {
    navigation.navigate('VolunteerDelivery', {
      taskId,
      selectedCollectionPoint: point,
    });
  };

  const getMapRegion = () => {
    if (points.length === 0) {
      return {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 10,
        longitudeDelta: 10,
      };
    }
    const validPoints = points.filter(
      (p) => p.location?.lat && p.location?.lng
    );
    if (validPoints.length === 0) {
      return {
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 10,
        longitudeDelta: 10,
      };
    }
    const lats = validPoints.map((p) => p.location.lat);
    const lngs = validPoints.map((p) => p.location.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.5),
    };
  };

  const renderPointItem = ({ item }) => (
    <TouchableOpacity
      style={styles.cardWrapper}
      onPress={() => handleSelectPoint(item)}
      activeOpacity={0.7}
    >
      <CollectionPointCard point={item} />
      <View style={styles.cardDetails}>
        <Text style={styles.pointName}>{item.name}</Text>
        <Text style={styles.pointAddress}>{item.address}</Text>

        {/* Capacity */}
        {item.capacity != null && item.currentLoad != null && (
          <View style={styles.capacityRow}>
            <Text style={styles.capacityLabel}>Capacity:</Text>
            <View style={styles.capacityBarWrapper}>
              <CapacityBar current={item.currentLoad} max={item.capacity} />
            </View>
          </View>
        )}

        {/* Accepted Types */}
        {item.acceptedTypes && item.acceptedTypes.length > 0 && (
          <View style={styles.typesRow}>
            <Text style={styles.typesLabel}>Accepts:</Text>
            <Text style={styles.typesValue}>
              {item.acceptedTypes.join(', ')}
            </Text>
          </View>
        )}

        {/* Operating Hours */}
        {item.operatingHours && (
          <View style={styles.hoursRow}>
            <Text style={styles.hoursLabel}>🕐</Text>
            <Text style={styles.hoursValue}>{item.operatingHours}</Text>
          </View>
        )}

        <Text style={styles.tapHint}>Tap to select this point</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingState message="Loading collection points..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (points.length === 0) {
    return <EmptyState message="No collection points available in your area." />;
  }

  return (
    <View style={styles.container}>
      {/* Toggle Map/List */}
      {MapView && (
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, !showMap && styles.toggleButtonActive]}
            onPress={() => setShowMap(false)}
          >
            <Text
              style={[
                styles.toggleText,
                !showMap && styles.toggleTextActive,
              ]}
            >
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, showMap && styles.toggleButtonActive]}
            onPress={() => setShowMap(true)}
          >
            <Text
              style={[
                styles.toggleText,
                showMap && styles.toggleTextActive,
              ]}
            >
              Map
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map View */}
      {showMap && MapView && (
        <View style={styles.mapContainer}>
          <MapView style={styles.map} initialRegion={getMapRegion()}>
            {points
              .filter((p) => p.location?.lat && p.location?.lng)
              .map((point) => (
                <Marker
                  key={point.id}
                  coordinate={{
                    latitude: point.location.lat,
                    longitude: point.location.lng,
                  }}
                  title={point.name}
                  description={point.address}
                  onCalloutPress={() => handleSelectPoint(point)}
                />
              ))}
          </MapView>
        </View>
      )}

      {/* List View */}
      <FlatList
        data={points}
        keyExtractor={(item) => item.id}
        renderItem={renderPointItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mainBackground,
  },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.navbarBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primaryButton,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.paragraph,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  mapContainer: {
    height: 250,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  map: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardWrapper: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardDetails: {
    padding: 16,
  },
  pointName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.heading,
    marginBottom: 4,
  },
  pointAddress: {
    fontSize: 13,
    color: Colors.paragraph,
    marginBottom: 10,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  capacityLabel: {
    fontSize: 13,
    color: Colors.paragraph,
    fontWeight: '500',
  },
  capacityBarWrapper: {
    flex: 1,
  },
  typesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 6,
  },
  typesLabel: {
    fontSize: 13,
    color: Colors.paragraph,
    fontWeight: '500',
  },
  typesValue: {
    fontSize: 13,
    color: Colors.heading,
    flex: 1,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  hoursLabel: {
    fontSize: 14,
  },
  hoursValue: {
    fontSize: 13,
    color: Colors.heading,
    fontWeight: '500',
  },
  tapHint: {
    fontSize: 12,
    color: Colors.primaryButton,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default CollectionPointsMapScreen;
