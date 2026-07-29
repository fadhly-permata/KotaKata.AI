import { useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
  Platform,
} from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import type { Board, BoardCell } from "../../../domain/entities/board";

interface CrosswordGridProps {
  board: Board;
  selectedCell: { row: number; col: number } | null;
  selectedWordIndex: number | null;
  inputOrientation: "horizontal" | "vertical" | null;
  onCellPress: (row: number, col: number) => void;
  onToggleOrientation: () => void;
  filledLetters: Map<string, string>;
  zoomLevel?: number;
}

const CELL_GAP = 3;
const GRID_PADDING = 3;

export default function CrosswordGrid({
  board,
  selectedCell,
  selectedWordIndex,
  inputOrientation,
  onCellPress,
  filledLetters,
  zoomLevel = 1,
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

  const solvedCellKey = useMemo(() => board.words.map((w) => w.solved).join(","), [board.words]);
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

      const handlePress = () => {
        if (!isSolved) onCellPress(cell.row, cell.col);
      };

      return (
        <TouchableOpacity
          key={key}
          testID={`cell-${cell.row}-${cell.col}`}
          activeOpacity={isSolved ? 1 : 0.7}
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
          <Text
            style={[
              styles.cellLetter,
              { fontSize, color: isSelected ? "#FFF" : isSolved ? theme.colors.cellSolvedText : theme.colors.cellText },
            ]}
          >
            {letter}
          </Text>
        </TouchableOpacity>
      );
    },
    [cellSize, fontSize, numberSize, selectedCell, selectedCells, solvedCells, filledLetters, onCellPress, theme],
  );

  // Account for gaps between cells + padding so nothing overflows / gets clipped
  const gridSize = cellSize * board.size + CELL_GAP * (board.size - 1) + GRID_PADDING * 2;

  return (
    <View
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
