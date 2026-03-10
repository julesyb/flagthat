import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily } from '../utils/theme';
import { countryCoordinates } from '../data/countryCoordinates';

interface MapImageProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
  style?: object;
}

const SIZE_MAP = {
  small: { width: 64, height: 64 },
  medium: { width: 120, height: 120 },
  large: { width: 280, height: 200 },
  hero: { width: 320, height: 240 },
};

// CartoDB no-labels basemap — free, no API key, no country names
const TILE_URL = 'https://basemaps.cartocdn.com/light_nolabels';

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return { x, y };
}

function getTileGrid(lat: number, lng: number, zoom: number, gridSize: number) {
  const center = latLngToTile(lat, lng, zoom);
  const half = Math.floor(gridSize / 2);
  const n = Math.pow(2, zoom);
  const tiles: { x: number; y: number; url: string }[] = [];

  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const x = ((center.x + dx) % n + n) % n;
      const y = center.y + dy;
      if (y >= 0 && y < n) {
        tiles.push({
          x: dx + half,
          y: dy + half,
          url: `${TILE_URL}/${zoom}/${x}/${y}.png`,
        });
      }
    }
  }
  return tiles;
}

// Pixel offset to center the country within the tile grid
function getCenterOffset(lat: number, lng: number, zoom: number, tileSize: number, gridSize: number) {
  const n = Math.pow(2, zoom);
  const xTile = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yTile = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const fractX = xTile - Math.floor(xTile);
  const fractY = yTile - Math.floor(yTile);

  const totalPx = gridSize * tileSize;
  const half = Math.floor(gridSize / 2);

  const centerPxX = (half + fractX) * tileSize;
  const centerPxY = (half + fractY) * tileSize;

  return {
    offsetX: centerPxX - totalPx / 2,
    offsetY: centerPxY - totalPx / 2,
  };
}

export default function MapImage({ countryCode, size = 'hero', style }: MapImageProps) {
  const dimensions = SIZE_MAP[size];
  const coord = countryCoordinates[countryCode.toLowerCase()];
  const [zoomDelta, setZoomDelta] = useState(0);

  const isInteractive = size === 'hero' || size === 'large';

  if (!coord) {
    return (
      <View style={[styles.fallback, dimensions, style]}>
        <Text style={styles.fallbackText}>?</Text>
      </View>
    );
  }

  const zoom = coord.zoom + zoomDelta;
  const TILE_SIZE = 256;
  const gridSize = size === 'small' ? 3 : size === 'medium' ? 3 : 5;
  const totalPx = gridSize * TILE_SIZE;

  const tiles = useMemo(() => getTileGrid(coord.lat, coord.lng, zoom, gridSize), [coord.lat, coord.lng, zoom, gridSize]);
  const offset = useMemo(() => getCenterOffset(coord.lat, coord.lng, zoom, TILE_SIZE, gridSize), [coord.lat, coord.lng, zoom, gridSize]);

  return (
    <View style={[styles.container, dimensions, style]}>
      <View
        style={{
          width: totalPx,
          height: totalPx,
          position: 'absolute',
          left: dimensions.width / 2 - offset.offsetX - TILE_SIZE * Math.floor(gridSize / 2),
          top: dimensions.height / 2 - offset.offsetY - TILE_SIZE * Math.floor(gridSize / 2),
        }}
      >
        {tiles.map((tile) => (
          <Image
            key={`${zoom}-${tile.x}-${tile.y}`}
            source={{ uri: tile.url }}
            style={{
              position: 'absolute',
              left: tile.x * TILE_SIZE,
              top: tile.y * TILE_SIZE,
              width: TILE_SIZE,
              height: TILE_SIZE,
            }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ))}
      </View>

      {/* Crosshair marker */}
      <View style={styles.crosshairH} pointerEvents="none" />
      <View style={styles.crosshairV} pointerEvents="none" />

      {/* Zoom controls */}
      {isInteractive && (
        <View style={styles.zoomControls}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => setZoomDelta((d) => Math.min(d + 1, 4))}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => setZoomDelta((d) => Math.max(d - 1, -2))}
            activeOpacity={0.7}
          >
            <Text style={styles.zoomText}>-</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export function MapImageSmall({ countryCode }: { countryCode: string }) {
  return <MapImage countryCode={countryCode} size="small" />;
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#e8e4df',
    borderWidth: 1,
    borderColor: colors.rule2,
  },
  fallback: {
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.rule2,
  },
  fallbackText: {
    fontSize: 24,
    color: colors.textTertiary,
  },
  crosshairH: {
    position: 'absolute',
    left: '45%',
    right: '45%',
    top: '50%',
    height: 1,
    backgroundColor: 'rgba(229, 39, 28, 0.35)',
  },
  crosshairV: {
    position: 'absolute',
    top: '45%',
    bottom: '45%',
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(229, 39, 28, 0.35)',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    gap: 4,
  },
  zoomButton: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.rule2,
  },
  zoomText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 18,
  },
});
