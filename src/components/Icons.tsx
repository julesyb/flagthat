import React from 'react';
import Svg, { Path, Circle, Line, Rect, Polyline, Polygon } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}

// Play triangle — main play button icon
export function PlayIcon({ size = 16, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polygon points="6,3 20,12 6,21" fill={color} />
    </Svg>
  );
}

// Lightning bolt — Quick Play / action icon
export function LightningIcon({ size = 18, color = '#FFFFFF', strokeWidth = 1.5, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={strokeWidth}>
      <Path d="M13 2L4.5 13.5H11L10 22L19.5 10H13L13 2Z" />
    </Svg>
  );
}

// Crosshair — Custom Game / Modes icon
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

// Chevron right — navigation / disclosure indicator
export function ChevronRightIcon({ size = 16, color = '#9CA3AF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Polyline points="9 6 15 12 9 18" />
    </Svg>
  );
}

// Checkmark — correct answer
export function CheckIcon({ size = 16, color = '#16A34A', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Polyline points="4 12 10 18 20 6" />
    </Svg>
  );
}

// Cross / X — wrong answer
export function CrossIcon({ size = 16, color = '#DC2626', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Line x1={6} y1={6} x2={18} y2={18} />
      <Line x1={18} y1={6} x2={6} y2={18} />
    </Svg>
  );
}

// Clock — time limit / time attack
export function ClockIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx={12} cy={12} r={9} />
      <Polyline points="12 7 12 12 15 15" />
    </Svg>
  );
}

// Flag — flag display mode toggle
export function FlagIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M4 21V4" />
      <Path d="M4 4 C4 4 7 2 10 4 C13 6 16 4 20 4 L20 15 C20 15 17 17 14 15 C11 13 8 15 4 15" />
    </Svg>
  );
}

// Users/Neighbors — people/connection icon
export function UsersIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <Circle cx={9} cy={7} r={4} />
      <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
}

// Eye — impostor/detect icon
export function EyeIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx={12} cy={12} r={3} />
    </Svg>
  );
}

// Link — connection/matching icon
export function LinkIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <Path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Svg>
  );
}

// Map pin — map display mode toggle
// Chevron left — back navigation
export function ChevronLeftIcon({ size = 16, color = '#9CA3AF', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 18L9 12L15 6" />
    </Svg>
  );
}

// Gear — Settings icon
export function GearIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  );
}

// Calendar — Daily Challenge icon
export function CalendarIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Rect x={3} y={4} width={18} height={18} rx={2} />
      <Line x1={16} y1={2} x2={16} y2={6} />
      <Line x1={8} y1={2} x2={8} y2={6} />
      <Line x1={3} y1={10} x2={21} y2={10} />
    </Svg>
  );
}

export function MapPinIcon({ size = 16, color = '#4B5563', strokeWidth = 1.5 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth}>
      <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
      <Circle cx={12} cy={9} r={2.5} />
    </Svg>
  );
}
