import React, { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Mask, Path, Pattern, Rect, Stop } from 'react-native-svg';

import { luminance, shade, tint } from '@/lib/theme';

// Flat-lay garment drawings on a 100x100 canvas. Each is filled with the item's
// colour; outline + fold details are derived from it so any colour stays legible.

type Paint = { fill: string; ink: string; detail: string; light: string };
type Draw = (p: Paint) => React.ReactNode;

const LONG_SLEEVE = 'M31 14 L42 10 Q50 17 58 10 L69 14 L81 26 L91 70 L80 73 L71 38 L71 90 L29 90 L29 38 L20 73 L9 70 L19 26 Z';
const TEE = 'M30 16 L42 12 Q50 19 58 12 L70 16 L88 32 L78 44 L71 38 L71 88 L29 88 L29 38 L22 44 L12 32 Z';

const D: Record<string, Draw> = {
  tshirt: (p) => (
    <>
      <Path d={TEE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 12 Q50 22 58 12" fill="none" stroke={p.ink} strokeWidth={1.4} />
      <Path d="M38 60 Q50 64 62 58" fill="none" stroke={p.detail} strokeWidth={1} />
    </>
  ),
  longsleeve: (p) => (
    <>
      <Path d={LONG_SLEEVE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 10 Q50 20 58 10" fill="none" stroke={p.ink} strokeWidth={1.4} />
      <Path d="M80 66 L90 64 M10 64 L20 66 M29 84 L71 84" stroke={p.detail} strokeWidth={1.2} />
    </>
  ),
  shirt: (p) => (
    <>
      <Path d={LONG_SLEEVE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 10 L50 22 L58 10 L55 7 L45 7 Z" fill={p.light} stroke={p.ink} strokeWidth={1.3} strokeLinejoin="round" />
      <Line x1={50} y1={22} x2={50} y2={90} stroke={p.ink} strokeWidth={1.1} />
      {[32, 46, 60, 74].map((y) => <Circle key={y} cx={53} cy={y} r={1.3} fill={p.ink} />)}
      <Path d="M58 34 L66 34 L66 42 L58 42 Z" fill="none" stroke={p.detail} strokeWidth={1} />
    </>
  ),
  polo: (p) => (
    <>
      <Path d={TEE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 12 L50 20 L58 12 L56 8 L44 8 Z" fill={p.light} stroke={p.ink} strokeWidth={1.3} strokeLinejoin="round" />
      <Path d="M50 20 L50 34" stroke={p.ink} strokeWidth={1.1} />
      <Circle cx={52.5} cy={25} r={1.2} fill={p.ink} />
      <Circle cx={52.5} cy={31} r={1.2} fill={p.ink} />
      <Path d="M22 44 L12 32 M78 44 L88 32" stroke={p.detail} strokeWidth={2.2} />
    </>
  ),
  blouse: (p) => (
    <>
      <Path d="M33 16 Q50 26 67 16 L82 26 Q90 38 80 46 L72 40 L74 84 Q50 92 26 84 L28 40 L20 46 Q10 38 18 26 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M44 22 L50 30 L56 22 M50 30 L46 40 M50 30 L54 40" fill="none" stroke={p.ink} strokeWidth={1.2} />
      <Path d="M30 70 Q50 76 70 70" fill="none" stroke={p.detail} strokeWidth={1} />
    </>
  ),
  tank: (p) => (
    <>
      <Path d="M35 10 L42 10 Q50 30 58 10 L65 10 Q65 26 72 32 L72 90 L28 90 L28 32 Q35 26 35 10 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M30 84 L70 84" stroke={p.detail} strokeWidth={1.2} />
    </>
  ),
  knit: (p) => (
    <>
      <Path d={LONG_SLEEVE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M41 11 Q50 21 59 11" fill="none" stroke={p.ink} strokeWidth={3} />
      <Rect x={29} y={82} width={42} height={8} fill={p.detail} opacity={0.35} />
      {[33, 38, 43, 48, 53, 58, 63, 68].map((x) => <Line key={x} x1={x} y1={82} x2={x} y2={90} stroke={p.ink} strokeWidth={0.8} />)}
      <Path d="M79 64 L90 61 M10 61 L21 64" stroke={p.ink} strokeWidth={3} />
    </>
  ),
  hoodie: (p) => (
    <>
      <Path d={LONG_SLEEVE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M37 14 Q38 0 50 0 Q62 0 63 14 Q58 26 50 26 Q42 26 37 14 Z" fill={p.light} stroke={p.ink} strokeWidth={1.4} />
      <Path d="M46 25 L45 40 M54 25 L55 40" stroke={p.ink} strokeWidth={1.2} />
      <Path d="M36 62 L64 62 L68 80 L32 80 Z" fill="none" stroke={p.ink} strokeWidth={1.2} strokeLinejoin="round" />
    </>
  ),
  cardigan: (p) => (
    <>
      <Path d={LONG_SLEEVE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 10 L50 44 L58 10" fill="none" stroke={p.ink} strokeWidth={1.3} />
      <Line x1={50} y1={44} x2={50} y2={90} stroke={p.ink} strokeWidth={1.2} />
      {[52, 64, 76].map((y) => <Circle key={y} cx={53} cy={y} r={1.6} fill={p.light} stroke={p.ink} strokeWidth={0.8} />)}
      <Rect x={29} y={84} width={42} height={6} fill={p.detail} opacity={0.35} />
    </>
  ),
  jacket: (p) => (
    <>
      <Path d={LONG_SLEEVE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 10 L46 20 L50 14 L54 20 L58 10" fill={p.light} stroke={p.ink} strokeWidth={1.3} strokeLinejoin="round" />
      <Line x1={50} y1={14} x2={50} y2={90} stroke={p.ink} strokeWidth={1.4} strokeDasharray="2 1.5" />
      <Path d="M34 40 L44 40 L44 50 L34 50 Z M56 40 L66 40 L66 50 L56 50 Z" fill="none" stroke={p.detail} strokeWidth={1.1} />
      <Path d="M29 82 L71 82" stroke={p.detail} strokeWidth={1.2} />
    </>
  ),
  blazer: (p) => (
    <>
      <Path d={LONG_SLEEVE} fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 10 L38 26 L44 28 L50 52 L56 28 L62 26 L58 10" fill={p.light} stroke={p.ink} strokeWidth={1.3} strokeLinejoin="round" />
      <Path d="M44 10 L50 52 L56 10" fill={p.detail} opacity={0.25} />
      <Circle cx={50} cy={62} r={1.7} fill={p.ink} />
      <Circle cx={50} cy={72} r={1.7} fill={p.ink} />
      <Path d="M33 70 L44 70 M56 70 L67 70 M58 36 L66 36" stroke={p.ink} strokeWidth={1.1} />
    </>
  ),
  coat: (p) => (
    <>
      <Path d="M31 8 L42 4 Q50 10 58 4 L69 8 L81 20 L91 66 L80 69 L72 34 L76 98 L24 98 L28 34 L20 69 L9 66 L19 20 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M42 4 L36 22 L44 24 L50 44 L56 24 L64 22 L58 4" fill={p.light} stroke={p.ink} strokeWidth={1.3} strokeLinejoin="round" />
      <Rect x={27} y={54} width={46} height={5} fill={p.detail} stroke={p.ink} strokeWidth={0.9} />
      <Line x1={50} y1={44} x2={50} y2={98} stroke={p.ink} strokeWidth={1.1} />
      {[48, 66, 80].map((y) => <Circle key={y} cx={45} cy={y} r={1.6} fill={p.ink} />)}
    </>
  ),
  puffer: (p) => (
    <>
      <Path d="M30 12 L42 8 Q50 14 58 8 L70 12 Q84 20 86 34 L92 68 Q86 74 80 70 L74 40 L74 88 Q50 94 26 88 L26 40 L20 70 Q14 74 8 68 L14 34 Q16 20 30 12 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      {[28, 44, 60, 76].map((y) => <Path key={y} d={`M27 ${y} Q50 ${y + 4} 73 ${y}`} fill="none" stroke={p.ink} strokeWidth={1.1} />)}
      <Path d="M14 46 L21 48 M86 46 L79 48 M11 58 L19 60 M89 58 L81 60" stroke={p.ink} strokeWidth={1} />
      <Line x1={50} y1={12} x2={50} y2={92} stroke={p.ink} strokeWidth={1.3} />
      <Path d="M40 8 Q50 2 60 8 L58 14 Q50 10 42 14 Z" fill={p.light} stroke={p.ink} strokeWidth={1.1} />
    </>
  ),
  jeans: (p) => (
    <>
      <Path d="M28 8 L72 8 L76 94 L57 94 L50 36 L43 94 L24 94 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M28 15 L72 15" stroke={p.ink} strokeWidth={1.2} />
      <Path d="M32 15 Q34 26 44 24 M68 15 Q66 26 56 24" fill="none" stroke={p.detail} strokeWidth={1.1} strokeDasharray="2 1.5" />
      <Path d="M50 15 L50 34" stroke={p.ink} strokeWidth={1} />
      <Circle cx={50} cy={11.5} r={1.4} fill={p.light} stroke={p.ink} strokeWidth={0.6} />
    </>
  ),
  trousers: (p) => (
    <>
      <Path d="M27 8 L73 8 L78 94 L57 94 L50 32 L43 94 L22 94 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M27 15 L73 15" stroke={p.ink} strokeWidth={1.2} />
      <Path d="M36 15 L33 94 M64 15 L67 94" stroke={p.detail} strokeWidth={1} />
      <Path d="M44 15 L42 24 M56 15 L58 24" stroke={p.ink} strokeWidth={1} />
    </>
  ),
  shorts: (p) => (
    <>
      <Path d="M27 22 L73 22 L80 66 L55 70 L50 44 L45 70 L20 66 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M27 29 L73 29" stroke={p.ink} strokeWidth={1.2} />
      <Path d="M22 60 L46 63 M54 63 L78 60" stroke={p.detail} strokeWidth={1.1} />
    </>
  ),
  skirt: (p) => (
    <>
      <Path d="M33 14 L67 14 L82 84 Q50 92 18 84 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Rect x={33} y={14} width={34} height={7} fill={p.light} stroke={p.ink} strokeWidth={1.1} />
      {[[42, 32], [50, 50], [58, 68]].map(([x1, x2]) => <Line key={x1} x1={x1} y1={21} x2={x2} y2={88} stroke={p.detail} strokeWidth={1} />)}
    </>
  ),
  joggers: (p) => (
    <>
      <Path d="M28 8 L72 8 L74 82 L70 92 L56 92 L54 82 L50 34 L46 82 L44 92 L30 92 L26 82 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Rect x={28} y={8} width={44} height={8} fill={p.light} stroke={p.ink} strokeWidth={1.1} />
      <Path d="M47 16 L45 26 M53 16 L55 26" stroke={p.ink} strokeWidth={1} />
      <Path d="M26 82 L46 82 M54 82 L74 82" stroke={p.ink} strokeWidth={1.2} />
      <Path d="M30 40 L40 40 L40 52 L30 52 Z M60 40 L70 40 L70 52 L60 52 Z" fill="none" stroke={p.detail} strokeWidth={1} />
    </>
  ),
  dress: (p) => (
    <>
      <Path d="M39 4 L45 4 Q50 12 55 4 L61 4 L63 28 Q60 36 64 42 L82 92 Q50 98 18 92 L36 42 Q40 36 37 28 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M37 36 Q50 40 63 36" fill="none" stroke={p.ink} strokeWidth={1.3} />
      <Path d="M44 44 L36 90 M56 44 L64 90 M50 44 L50 94" stroke={p.detail} strokeWidth={1} />
    </>
  ),
  sneakers: (p) => (
    <>
      <Path d="M10 66 Q11 46 24 44 L38 42 Q46 54 60 56 L80 59 Q92 61 91 70 L91 72 L10 72 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M8 72 L93 72 L93 79 Q50 84 8 79 Z" fill={p.light} stroke={p.ink} strokeWidth={1.4} strokeLinejoin="round" />
      {[44, 50, 56].map((x) => <Line key={x} x1={x - 4} y1={48 + (x - 44) / 2} x2={x + 3} y2={52 + (x - 44) / 2} stroke={p.ink} strokeWidth={1.2} />)}
      <Path d="M22 58 Q40 64 60 62" fill="none" stroke={p.detail} strokeWidth={1.4} />
    </>
  ),
  boots: (p) => (
    <>
      <Path d="M28 12 L54 12 L56 56 Q80 58 86 70 L86 80 L26 80 L28 12 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M24 80 L88 80 L88 88 L24 88 Z" fill={p.ink} />
      <Path d="M28 22 L54 22" stroke={p.detail} strokeWidth={1.2} />
      <Path d="M40 12 L40 50 Q42 56 50 56" fill="none" stroke={p.detail} strokeWidth={1.2} />
    </>
  ),
  loafers: (p) => (
    <>
      <Path d="M10 68 Q12 52 28 52 L60 52 Q84 54 90 66 L90 74 L10 74 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M8 74 L92 74 L92 80 L8 80 Z" fill={shade(p.fill, 0.55)} />
      <Path d="M52 53 Q64 50 76 56 L74 62 Q62 58 54 60 Z" fill={p.light} stroke={p.ink} strokeWidth={1.1} />
      <Path d="M60 56 L70 58" stroke={p.ink} strokeWidth={1.4} />
    </>
  ),
  heels: (p) => (
    <>
      <Path d="M12 72 Q14 54 28 52 Q48 58 66 48 L84 40 Q90 40 90 48 L86 50 L82 52 L82 82 L78 82 L74 58 Q48 76 12 72 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M12 72 Q46 78 74 58" fill="none" stroke={p.ink} strokeWidth={2.2} />
      <Path d="M28 52 Q32 60 40 58" fill="none" stroke={p.detail} strokeWidth={1.1} />
    </>
  ),
  sandals: (p) => (
    <>
      <Path d="M10 72 Q12 64 24 64 L82 64 Q92 66 92 72 L92 78 L10 78 Z" fill={shade(p.fill, 0.35)} stroke={p.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M30 64 Q34 46 46 46 Q56 46 58 64" fill="none" stroke={p.fill} strokeWidth={7} strokeLinecap="round" />
      <Path d="M62 64 Q66 52 76 54" fill="none" stroke={p.fill} strokeWidth={5} strokeLinecap="round" />
      <Path d="M30 64 Q34 46 46 46 Q56 46 58 64" fill="none" stroke={p.ink} strokeWidth={0.8} />
    </>
  ),
  bag: (p) => (
    <>
      <Path d="M36 40 Q36 14 50 14 Q64 14 64 40" fill="none" stroke={p.ink} strokeWidth={4} />
      <Path d="M36 40 Q36 14 50 14 Q64 14 64 40" fill="none" stroke={p.fill} strokeWidth={2.4} />
      <Path d="M20 38 L80 38 L75 90 L25 90 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M22 50 L78 50" stroke={p.detail} strokeWidth={1.1} />
      <Rect x={45} y={46} width={10} height={8} rx={2} fill={p.light} stroke={p.ink} strokeWidth={0.9} />
    </>
  ),
  cap: (p) => (
    <>
      <Path d="M16 64 Q18 28 52 28 Q78 30 78 64 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} strokeLinejoin="round" />
      <Path d="M52 64 L94 62 Q96 72 78 72 L52 70 Z" fill={shade(p.fill, 0.12)} stroke={p.ink} strokeWidth={1.4} strokeLinejoin="round" />
      <Path d="M48 29 Q44 46 46 64 M30 36 Q30 50 32 64" fill="none" stroke={p.detail} strokeWidth={1} />
      <Circle cx={51} cy={28} r={2.6} fill={p.ink} />
    </>
  ),
  beanie: (p) => (
    <>
      <Circle cx={50} cy={17} r={8} fill={p.light} stroke={p.ink} strokeWidth={1.2} />
      <Path d="M22 66 Q20 24 50 22 Q80 24 78 66 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.25} />
      <Rect x={20} y={60} width={60} height={20} rx={4} fill={shade(p.fill, 0.1)} stroke={p.ink} strokeWidth={1.4} />
      {[28, 36, 44, 52, 60, 68].map((x) => <Line key={x} x1={x} y1={62} x2={x} y2={78} stroke={p.detail} strokeWidth={1} />)}
    </>
  ),
  scarf: (p) => (
    <>
      <Path d="M28 10 L48 10 L48 72 L28 76 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M48 10 L72 14 L60 84 L44 80 Z" fill={shade(p.fill, 0.12)} stroke={p.ink} strokeWidth={1.5} strokeLinejoin="round" />
      {[0, 1, 2, 3, 4].map((i) => <Line key={i} x1={46 + i * 3.5} y1={81 + i * 0.7} x2={45 + i * 3.5} y2={90 + i * 0.7} stroke={p.ink} strokeWidth={1} />)}
      <Path d="M28 30 L48 30 M28 50 L48 50" stroke={p.detail} strokeWidth={2} />
    </>
  ),
  watch: (p) => (
    <>
      <Rect x={40} y={6} width={20} height={88} rx={6} fill={p.fill} stroke={p.ink} strokeWidth={1.5} />
      <Circle cx={50} cy={50} r={18} fill={p.light} stroke={p.ink} strokeWidth={2.4} />
      <Path d="M50 50 L50 38 M50 50 L58 54" stroke={p.ink} strokeWidth={1.25} strokeLinecap="round" />
      {[20, 28, 72, 80].map((y) => <Circle key={y} cx={50} cy={y} r={1.1} fill={p.ink} />)}
    </>
  ),
  sunglasses: (p) => (
    <>
      <Path d="M6 40 L16 40 M84 40 L94 40" stroke={p.ink} strokeWidth={2.2} strokeLinecap="round" />
      <Ellipse cx={30} cy={50} rx={17} ry={13} fill={shade(p.fill, 0.45)} stroke={p.ink} strokeWidth={2.4} />
      <Ellipse cx={70} cy={50} rx={17} ry={13} fill={shade(p.fill, 0.45)} stroke={p.ink} strokeWidth={2.4} />
      <Path d="M47 46 Q50 42 53 46" fill="none" stroke={p.ink} strokeWidth={2.2} />
      <Path d="M22 44 L28 40 M62 44 L68 40" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  belt: (p) => (
    <>
      <Path d="M4 44 L96 40 L96 54 L4 58 Z" fill={p.fill} stroke={p.ink} strokeWidth={1.5} strokeLinejoin="round" />
      <Rect x={22} y={38} width={18} height={24} rx={3} fill="none" stroke={p.light === p.fill ? p.ink : '#C9A44C'} strokeWidth={3} />
      {[60, 70, 80].map((x) => <Circle key={x} cx={x} cy={48.5 - (x - 60) * 0.04} r={1.4} fill={p.ink} />)}
    </>
  ),
  necklace: (p) => (
    <>
      <Path d="M18 16 Q20 70 50 74 Q80 70 82 16" fill="none" stroke={p.ink} strokeWidth={1} />
      {Array.from({ length: 15 }).map((_, i) => {
        const t = i / 14;
        const x = 18 + 64 * t;
        const y = 16 + 58 * Math.sin(Math.PI * t) * 0.98;
        return <Circle key={i} cx={x} cy={y} r={3.4} fill={p.fill} stroke={p.ink} strokeWidth={0.8} />;
      })}
      <Circle cx={50} cy={82} r={5} fill={p.light} stroke={p.ink} strokeWidth={1} />
    </>
  ),
};

export function paintFor(hex: string): Paint {
  const dark = luminance(hex) < 0.08;
  return {
    fill: hex,
    ink: dark ? tint(hex, 0.3) : shade(hex, 0.34),
    detail: dark ? tint(hex, 0.2) : shade(hex, 0.18),
    light: dark ? tint(hex, 0.18) : tint(hex, 0.35),
  };
}

const SOLID = (c: string): Paint => ({ fill: c, ink: c, detail: c, light: c });

/**
 * A garment = soft cast shadow + coloured silhouette + fabric finish
 * (fine weave and a light-to-shadow sheen, masked to the garment's own shape).
 */
export function Garment({ type, color, size = 64 }: { type: string; color: string; size?: number }) {
  const draw = D[type] ?? D.tshirt;
  const id = `g${useId().replace(/[^a-z0-9]/gi, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <Mask id={`${id}m`} maskUnits="userSpaceOnUse" x={0} y={0} width={100} height={100}>
          {draw(SOLID('#FFFFFF'))}
        </Mask>
        <Pattern id={`${id}w`} width={2.2} height={2.2} patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <Line x1={0} y1={0.6} x2={2.2} y2={0.6} stroke="#000000" strokeOpacity={0.07} strokeWidth={0.45} />
        </Pattern>
        <LinearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
          <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset="1" stopColor="#000000" stopOpacity={0.14} />
        </LinearGradient>
      </Defs>
      <G opacity={0.13} transform="translate(1.6 2.6)">
        {draw(SOLID('#1A1020'))}
      </G>
      <G>{draw(paintFor(color))}</G>
      <G mask={`url(#${id}m)`}>
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}w)`} />
        <Rect x={0} y={0} width={100} height={100} fill={`url(#${id}s)`} />
      </G>
    </Svg>
  );
}

export const GARMENT_TYPES = Object.keys(D);
