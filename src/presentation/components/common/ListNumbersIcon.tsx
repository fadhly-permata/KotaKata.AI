import Svg, { Path } from "react-native-svg";

interface ListNumbersIconProps {
  size?: number;
  color?: string;
}

/** Ikon daftar bernomor (dari svgviewer.dev/s/463818/list-numbers — IconPark). */
export default function ListNumbersIcon({ size = 18, color = "#FFF" }: ListNumbersIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <Path d="M20 9H42" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 19H42" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 29H42" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M20 39H42" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 29H12V32L6 38V39H12" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7 11L9 9V19M9 19H7M9 19H11" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
