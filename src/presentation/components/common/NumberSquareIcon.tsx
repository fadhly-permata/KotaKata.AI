import Svg, { Path } from "react-native-svg";

interface NumberSquareIconProps {
  number: 1 | 2 | 3;
  size?: number;
  color?: string;
}

/** Ikon kotak bernomor (dari svgviewer.dev number-1/2/3-square — Dariush Habibpour). */
export default function NumberSquareIcon({ number, size = 18, color = "#FFF" }: NumberSquareIconProps) {
  const digitPath =
    number === 1
      ? "M12.5 17V7L10.5 9"
      : number === 2
        ? "M9.50012 9.49997C9.50013 8.86017 9.7442 8.22037 10.2324 7.73221C11.2087 6.7559 12.7916 6.7559 13.7679 7.73221C14.7442 8.70852 14.7442 10.2914 13.7679 11.2677L9.93946 15.0962C9.65816 15.3775 9.50012 15.759 9.50012 16.1568L9.50012 17H14.5001"
        : "M10 16.2361C10.5308 16.7111 11.2316 17 12 17C13.6569 17 15 15.6569 15 14C15 12.3431 13.6569 11 12 11L15 7H10";

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4.00104H20V18.001C20 19.1056 19.1046 20.001 18 20.001H6C4.89543 20.001 4 19.1056 4 18.001V4.00104Z"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d={digitPath} stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
