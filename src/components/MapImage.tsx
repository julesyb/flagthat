import React, { useState, useMemo, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { colors, fontFamily } from '../utils/theme';
import { countryCoordinates } from '../data/countryCoordinates';

interface MapImageProps {
  countryCode: string;
  size?: 'small' | 'medium' | 'large' | 'hero';
  style?: object;
}

// CartoDB no-labels basemap — free, no API key, no country names
const TILE_URL = 'https://basemaps.cartocdn.com/light_nolabels';
const TILE_SIZE = 256;

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
function getCenterOffset(lat: number, lng: number, zoom: number, gridSize: number) {
  const n = Math.pow(2, zoom);
  const xTile = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yTile = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const fractX = xTile - Math.floor(xTile);
  const fractY = yTile - Math.floor(yTile);

  const half = Math.floor(gridSize / 2);

  const centerPxX = (half + fractX) * TILE_SIZE;
  const centerPxY = (half + fractY) * TILE_SIZE;

  return { centerPxX, centerPxY };
}

export default function MapImage({ countryCode, size = 'hero', style }: MapImageProps) {
  const { width: screenWidth } = useWindowDimensions();
  const coord = countryCoordinates[countryCode.toLowerCase()];
  const [zoomDelta, setZoomDelta] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const isInteractive = size === 'hero' || size === 'large';

  const dimensions = useMemo(() => {
    if (size === 'hero') {
      return { width: Math.min(screenWidth - 48, 500), height: 340 };
    }
    const fixed = { small: { width: 64, height: 64 }, medium: { width: 120, height: 120 }, large: { width: 280, height: 200 } };
    return fixed[size] || fixed.medium;
  }, [size, screenWidth]);

  if (!coord) {
    return (
      <View style={[styles.fallback, dimensions, style]}>
        <Text style={styles.fallbackText}>?</Text>
      </View>
    );
  }

  const zoom = coord.zoom + zoomDelta;
  const gridSize = size === 'small' || size === 'medium' ? 3 : 7;
  const totalPx = gridSize * TILE_SIZE;

  const tiles = useMemo(() => getTileGrid(coord.lat, coord.lng, zoom, gridSize), [coord.lat, coord.lng, zoom, gridSize]);
  const centerOffset = useMemo(() => getCenterOffset(coord.lat, coord.lng, zoom, gridSize), [coord.lat, coord.lng, zoom, gridSize]);

  const scrollToCenter = () => {
    scrollRef.current?.scrollTo({
      x: centerOffset.centerPxX - dimensions.width / 2,
      y: centerOffset.centerPxY - dimensions.height / 2,
      animated: false,
    });
  };

  // Re-center when zoom changes
  useEffect(() => {
    if (isInteractive) {
      // Small delay to let new tiles render before scrolling
      const timer = setTimeout(scrollToCenter, 50);
      return () => clearTimeout(timer);
    }
  }, [zoom, dimensions.width, dimensions.height]);

  // Pin marker position — centered on the country coordinates
  const PIN_WIDTH = 30;
  const PIN_HEIGHT = 40;
  const pinLeft = centerOffset.centerPxX - PIN_WIDTH / 2;
  const pinTop = centerOffset.centerPxY - PIN_HEIGHT;

  if (!isInteractive) {
    // Non-interactive: simple clipped view (small/medium sizes)
    return (
      <View style={[styles.container, dimensions, style]}>
        <View
          style={{
            width: totalPx,
            height: totalPx,
            position: 'absolute',
            left: dimensions.width / 2 - centerOffset.centerPxX,
            top: dimensions.height / 2 - centerOffset.centerPxY,
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
          {/* Pin marker on the country */}
          <View style={[styles.pinMarker, { left: pinLeft, top: pinTop, width: PIN_WIDTH, height: PIN_HEIGHT }]} pointerEvents="none">
            <View style={styles.pinHead} />
            <View style={styles.pinPoint} />
          </View>
        </View>
      </View>
    );
  }

  const handleZoomIn = () => {
    setZoomDelta((d) => Math.min(d + 1, 4));
  };

  const handleZoomOut = () => {
    setZoomDelta((d) => Math.max(d - 1, -2));
  };

  // Interactive: ScrollView with pinch-to-zoom + pan
  return (
    <View style={[styles.container, dimensions, style]}>
      <ScrollView
        ref={scrollRef}
        style={dimensions}
        contentOffset={{
          x: centerOffset.centerPxX - dimensions.width / 2,
          y: centerOffset.centerPxY - dimensions.height / 2,
        }}
        minimumZoomScale={1}
        maximumZoomScale={3}
        bouncesZoom
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        <View style={{ width: totalPx, height: totalPx }}>
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
          {/* Pin marker on the country — inside ScrollView so it stays on location */}
          <View style={[styles.pinMarker, { left: pinLeft, top: pinTop, width: PIN_WIDTH, height: PIN_HEIGHT }]} pointerEvents="none">
            <View style={styles.pinHead} />
            <View style={styles.pinPoint} />
          </View>
        </View>
      </ScrollView>

      {/* Zoom buttons */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={handleZoomIn}
          activeOpacity={0.7}
        >
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.zoomButton}
          onPress={handleZoomOut}
          activeOpacity={0.7}
        >
          <Text style={styles.zoomText}>-</Text>
        </TouchableOpacity>
      </View>
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
  pinMarker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  pinHead: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 6,
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.accent,
    marginTop: -2,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    gap: 6,
  },
  zoomButton: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.rule2,
  },
  zoomText: {
    fontFamily: fontFamily.uiLabel,
    fontSize: 20,
    color: colors.ink,
    lineHeight: 22,
  },
});
