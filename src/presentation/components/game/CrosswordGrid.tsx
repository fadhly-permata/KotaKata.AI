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
  filledLetters: Map<string, string>; // "row,col" -> letter
}

export default function CrosswordGrid({
  board,
  selectedCell,
  selectedWordIndex,
  inputOrientation,
  onCellPress,
  filledLetters,
}: CrosswordGridProps) {
  const { theme } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const cellSize = useMemo(() => {
    const maxGridWidth = Math.min(screenWidth - 32, 480);
    return Math.floor(maxGridWidth / board.size);
  }, [screenWidth, board.size]);

  const fontSize = useMemo(() => Math.max(14, cellSize * 0.45), [cellSize]);
  const numberSize = useMemo(() => Math.max(8, fontSize * 0.45), [fontSize]);

  // Build set of cells that belong to the selected word
  const selectedCells = useMemo(() => {
    const set = new Set<string>();
    if (selectedWordIndex !== null && board.words[selectedWordIndex]) {
      for (const cell of board.words[selectedWordIndex].cells) {
        set.add(`${cell.row},${cell.col}`);
      }
    }
    return set;
  }, [selectedWordIndex, board.words]);

  // Build set of solved cells (locked words)
  const solvedStateKey = board.words.map((w) => w.solved).join(",");
  const solvedCells = useMemo(() => {
    const set = new Set<string>();
    for (const w of board.words) {
      if (!w.solved) continue;
      for (const c of w.cells) {
        set.add(`${c.row},${c.col}`);
      }
    }
    return set;
  }, [board.words, solvedStateKey]);

  const renderCell = useCallback((cell: BoardCell) => {
    const key = `${cell.row},${cell.col}`;
    const isSelected = selectedCell?.row === cell.row && selectedCell?.col === cell.col;
    const isHighlighted = selectedCells.has(key);
    const isSolved = solvedCells.has(key);
    const letter = filledLetters.get(key) ?? (cell.isLocked ? cell.letter : "");

    if (cell.isBlocked) {
      return (
        <View
          key={key}
          style={[
            styles.cell,
            {
              width: cellSize,
              height: cellSize,
              backgroundColor: theme.colors.cellBlocked,
            },
          ]}
        />
      );
    }

    // Color selection
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
        activeOpacity={isSolved ? 1 : 0.6}
        onPress={handlePress}
        {...(Platform.OS === "web"
          ? { onClick: handlePress }
          : {})}
        style={[
          styles.cell,
          {
            width: cellSize,
            height: cellSize,
            backgroundColor: bgColor,
            borderColor: borderColor,
            borderWidth: borderW,
          },
        ]}
      >
        {cell.number != null && (
          <Text
            style={[
              styles.cellNumber,
              {
                fontSize: numberSize,
                color: theme.colors.textSecondary,
              },
            ]}
          >
            {cell.number}
          </Text>
        )}
        <Text
          style={[
            styles.cellLetter,
            {
              fontSize,
              color: isSolved ? theme.colors.cellSolvedText : theme.colors.cellText,
            },
          ]}
        >
          {letter}
        </Text>
      </TouchableOpacity>
    );
  }, [cellSize, fontSize, numberSize, selectedCell, selectedCells, solvedCells, filledLetters, onCellPress, theme]);

  return (
    <View
      style={[
        styles.container,
        {
          width: cellSize * board.size,
          backgroundColor: theme.colors.surface,
          borderRadius: 8,
        },
      ]}
    >
      {board.grid.map((row, r) => (
        <View key={`row-${r}`} style={styles.row}>
          {row.map((cell) => renderCell(cell))}
        </View>
      ))}

      {inputOrientation && (
        <View style={styles.orientationBadge}>
          <Text
            style={[
              styles.orientationText,
              { color: theme.colors.primary },
            ]}
          >
            {inputOrientation === "horizontal" ? "→ MENDATAR" : "↓ MENURUN"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    padding: 1,
  },
  row: {
    flexDirection: "row",
  },
  cell: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    cursor: "pointer",
  },
  cellNumber: {
    position: "absolute",
    top: 1,
    left: 2,
    fontWeight: "500",
  },
  cellLetter: {
    fontWeight: "600",
    textTransform: "uppercase",
  },
  orientationBadge: {
    position: "absolute",
    bottom: -30,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.08)",
  },
  orientationText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
