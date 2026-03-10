import React from 'react';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}

// Lightning bolt — Quick Play hero icon
export function LightningIcon({ size = 18, color = '#FFFFFF', strokeWidth = 1.5, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M13 2L4.5 13.5H11L10 22L19.5 10H13L13 2Z" />
    </Svg>
  );
}

// Crosshair — Custom Game icon
export function CrosshairIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx={12} cy={12} r={7} />
      <Line x1={12} y1={2} x2={12} y2={6} />
      <Line x1={12} y1={18} x2={12} y2={22} />
      <Line x1={2} y1={12} x2={6} y2={12} />
      <Line x1={18} y1={12} x2={22} y2={12} />
      <Circle cx={12} cy={12} r={2} fill={color} stroke="none" />
    </Svg>
  );
}

// Bar chart — Statistics icon
export function BarChartIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Rect x={3} y={13} width={4} height={8} />
      <Rect x={10} y={8} width={4} height={13} />
      <Rect x={17} y={3} width={4} height={18} />
    </Svg>
  );
}

// Puzzle piece — Flag Puzzle icon
export function PuzzleIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M4 7h3a2 2 0 0 0 2-2 2 2 0 0 1 4 0 2 2 0 0 0 2 2h3v3a2 2 0 0 0 2 2 2 2 0 0 1 0 4 2 2 0 0 0-2 2v3H4v-3a2 2 0 0 1 0-4 2 2 0 0 0 0-4V7Z" />
    </Svg>
  );
}

// Globe — Browse Flags icon
export function GlobeIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx={12} cy={12} r={9} />
      <Line x1={3} y1={12} x2={21} y2={12} />
      <Path d="M12 3 C8 7 8 17 12 21 C16 17 16 7 12 3Z" />
    </Svg>
  );
}
