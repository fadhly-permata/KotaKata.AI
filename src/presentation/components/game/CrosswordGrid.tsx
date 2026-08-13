import { useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Platform,
  PanResponder,
  Animated,
} from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { Board, BoardCell } from "../../../domain/entities/board";

interface CrosswordGridProps {
  board: Board;
  selectedCell: { row: number; col: number } | null;
  selectedWordIndex: number | null;
  inputOrientation: "horizontal" | "vertical" | null;
  onCellPress: (row: number, col: number) => void;
  /** Dipanggil saat jari/mouse menggeser melewati sebuah sel (swipe-to-move). */
  onCellDrag?: (row: number, col: number) => void;
  onToggleOrientation: () => void;
  filledLetters: Map<string, string>;
  zoomLevel?: number;
  /** Pemicu animasi zoom-out per sel yang baru di-reveal/diganti (key sel → counter). */
  revealedPulse?: Record<string, number>;
}

const CELL_GAP = 3;
const GRID_PADDING = 3;
const BORDER_WIDTH = 1; // border container (styles.container)
const DRAG_CLAIM_PX = 6; // geser minimal sebelum drag mengambil alih dari tap

export default function CrosswordGrid({
  board,
  selectedCell,
  selectedWordIndex,
  inputOrientation,
  onCellPress,
  onCellDrag,
  filledLetters,
  zoomLevel = 1,
  revealedPulse,
}: CrosswordGridProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const baseCellSize = useMemo(() => {
    // Account for ALL fixed spacing so grid perfectly fits available width
    const outerMargin = 8; // 4px padding on each side of gridCenterWrapper
    const availableWidth = screenWidth - outerMargin;
    const gapsTotal = CELL_GAP * (board.size - 1);
    const borderTotal = 2; // 1px on each side
    const paddingTotal = GRID_PADDING * 2;
    const fixedSpace = gapsTotal + borderTotal + paddingTotal;
    return Math.floor((availableWidth - fixedSpace) / board.size);
  }, [screenWidth, board.size]);

  const cellSize = useMemo(() => Math.floor(baseCellSize * zoomLevel), [baseCellSize, zoomLevel]);
  const fontSize = useMemo(() => Math.max(12, cellSize * 0.45), [cellSize]);
  const numberSize = useMemo(() => Math.max(7, fontSize * 0.4), [fontSize]);

  const selectedCells = useMemo(() => {
    const set = new Set<string>();
    if (selectedWordIndex !== null && board.words[selectedWordIndex]) {
      for (const cell of board.words[selectedWordIndex].cells) {
        set.add(`${cell.row},${cell.col}`);
      }
    }
    return set;
  }, [selectedWordIndex, board.words]);

  // Catatan: solvedCellKey dihitung FRESH tiap render (bukan useMemo).
  // markWordSolved mengubah word.solved langsung di objek board (mutasi, bukan
  // objek baru) — kalau key-nya dimemo pada [board.words], referensi tidak
  // pernah berubah dan memo basi: sel yang baru terjawab tidak akan berubah
  // hijau saat bermain. String hasil join berubah tiap ada kata yang baru
  // solved, jadi solvedCells di bawah ikut recompute dengan benar.
  const solvedCellKey = board.words.map((w) => w.solved).join(",");
  const solvedCells = useMemo(() => {
    const set = new Set<string>();
    for (const w of board.words) {
      if (!w.solved) continue;
      for (const c of w.cells) {
        set.add(`${c.row},${c.col}`);
      }
    }
    return set;
  }, [board.words, solvedCellKey]);

  const renderCell = useCallback(
    (cell: BoardCell) => {
      const key = `${cell.row},${cell.col}`;
      const isSelected = selectedCell?.row === cell.row && selectedCell?.col === cell.col;
      const isHighlighted = selectedCells.has(key);
      const isSolved = solvedCells.has(key);
      const letter = filledLetters.get(key) ?? (cell.isLocked ? cell.letter : "");

      if (cell.isBlocked) {
        return (
          <View
            key={key}
            testID={`blocked-${cell.row}-${cell.col}`}
            style={[
              styles.cell,
              styles.blockedCell,
              { width: cellSize, height: cellSize, backgroundColor: theme.colors.cellBlocked, borderRadius: 4 },
            ]}
          />
        );
      }

      let bgColor: string;
      let borderColor: string;
      let borderW = 1;

      if (isSolved) {
        bgColor = theme.colors.cellSolved;
        borderColor = theme.colors.cellSolvedText;
      } else if (isSelected) {
        bgColor = theme.colors.primary;
        borderColor = theme.colors.primary;
        borderW = 2;
      } else if (isHighlighted) {
        bgColor = theme.mode === "dark" ? "#2A2938" : "#EDE8FF";
        borderColor = theme.colors.primary;
      } else {
        bgColor = theme.colors.cellActive;
        borderColor = theme.colors.cellBorder;
      }

      // Cell solved TETAP bisa di-tap — tujuannya untuk memilih kata & melihat
      // clue-nya lagi (input huruf tetap diblokir karena cell-nya terkunci).
      const handlePress = () => {
        onCellPress(cell.row, cell.col);
      };

      return (
        <TouchableOpacity
          key={key}
          testID={`cell-${cell.row}-${cell.col}`}
          activeOpacity={0.7}
          onPress={handlePress}
          {...(Platform.OS === "web" ? { onClick: handlePress } : {})}
          style={[
            styles.cell,
            styles.activeCell,
            {
              width: cellSize,
              height: cellSize,
              backgroundColor: bgColor,
              borderColor: borderColor,
              borderWidth: borderW,
              transform: isSelected ? [{ scale: 1.08 }] : [{ scale: 1 }],
              zIndex: isSelected ? 10 : 1,
              ...(isSelected ? { shadowColor: theme.colors.primary } : {}),
            },
          ]}
        >
          {cell.number != null && (
            <Text
              style={[styles.cellNumber, { fontSize: numberSize, color: isSelected ? "#FFF" : theme.colors.textSecondary }]}
            >
              {cell.number}
            </Text>
          )}
          {letter ? (
            <RevealPulseLetter
              pulse={revealedPulse?.[key] ?? 0}
              fontSize={fontSize}
              color={
                isSelected ? "#FFF" : isSolved ? theme.colors.cellSolvedText : theme.colors.cellText
              }
            >
              {letter}
            </RevealPulseLetter>
          ) : (
            <Text style={[styles.cellLetter, { fontSize, color: theme.colors.cellText }]}>
              {letter}
            </Text>
          )}
        </TouchableOpacity>
      );
    },
    [cellSize, fontSize, numberSize, selectedCell, selectedCells, solvedCells, filledLetters, onCellPress, theme, revealedPulse],
  );

  // ---- Drag/swipe: kursor mengikuti jari/mouse melintasi sel ----
  const cellFromLocation = useCallback(
    (x: number, y: number): { row: number; col: number } | null => {
      // Lokasi relatif terhadap container (border box). Konten sel pertama
      // mulai di border + padding. Iterasi semua sel biar kebal terhadap
      // selisih hitungan gap/padding di berbagai platform.
      const origin = GRID_PADDING + BORDER_WIDTH;
      for (let r = 0; r < board.size; r++) {
        for (let c = 0; c < board.size; c++) {
          const cellX = origin + c * (cellSize + CELL_GAP);
          const cellY = origin + r * (cellSize + CELL_GAP);
          if (x >= cellX && x < cellX + cellSize && y >= cellY && y < cellY + cellSize) {
            return { row: r, col: c };
          }
        }
      }
      return null;
    },
    [board.size, cellSize],
  );

  const lastDragCellRef = useRef<string | null>(null);

  // Tap tetap bekerja normal (start responder = false). Drag baru mengambil
  // alih setelah bergeser cukup jauh dan dominan horizontal — supaya scroll
  // vertikal halaman (dan scroll papan saat zoom > 1) tidak tertukar.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          zoomLevel <= 1 &&
          Math.abs(gesture.dx) > DRAG_CLAIM_PX &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: (evt) => {
          const cell = cellFromLocation(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
          if (!cell) return;
          lastDragCellRef.current = `${cell.row},${cell.col}`;
          onCellDrag?.(cell.row, cell.col);
        },
        onPanResponderMove: (evt) => {
          const cell = cellFromLocation(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
          if (!cell) return;
          const key = `${cell.row},${cell.col}`;
          if (lastDragCellRef.current === key) return;
          lastDragCellRef.current = key;
          onCellDrag?.(cell.row, cell.col);
        },
        onPanResponderRelease: () => {
          lastDragCellRef.current = null;
        },
        onPanResponderTerminate: () => {
          lastDragCellRef.current = null;
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [zoomLevel, cellFromLocation, onCellDrag],
  );

  // Account for gaps between cells + padding so nothing overflows / gets clipped
  const gridSize = cellSize * board.size + CELL_GAP * (board.size - 1) + GRID_PADDING * 2;

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          width: gridSize,
          backgroundColor: theme.colors.surface,
          borderRadius: 12,
          borderColor: theme.colors.border,
          shadowColor: "#000",
        },
      ]}
    >
      {board.grid.map((row, r) => (
        <View key={`row-${r}`} style={styles.row}>
          {row.map((cell) => renderCell(cell))}
        </View>
      ))}
    </View>
  );
}

/**
 * Huruf sel yang baru di-reveal/diganti — animasi "zoom out": huruf mengecil
 * cepat lalu membal ke ukuran normal dengan pantulan, supaya pemain langsung
 * melihat bahwa jawaban di sel itu sudah diganti. `pulse` adalah counter yang
 * naik setiap kali sel itu di-reveal (dari gameStore.revealedPulse); saat
 * nilainya berubah, animasi diputar ulang.
 */
function RevealPulseLetter({
  pulse,
  fontSize,
  color,
  children,
}: {
  pulse: number;
  fontSize: number;
  color: string;
  children: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) return;
    scale.setValue(1);
    opacity.setValue(1);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.2, duration: 150, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.25, duration: 150, useNativeDriver: true }),
      ]),
      Animated.spring(scale, { toValue: 1, friction: 3, tension: 150, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [pulse, scale, opacity]);

  return (
    <Animated.Text
      style={[
        styles.cellLetter,
        { fontSize, color, transform: [{ scale }], opacity },
      ]}
    >
      {children}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    padding: GRID_PADDING,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  row: { flexDirection: "row", gap: CELL_GAP, marginBottom: CELL_GAP },
  cell: { justifyContent: "center", alignItems: "center", position: "relative", cursor: "pointer" },
  activeCell: { borderRadius: 6 },
  blockedCell: {},
  cellNumber: { position: "absolute", top: 1, left: 2, fontWeight: "500" },
  cellLetter: { fontWeight: "600", textTransform: "uppercase" },
});
