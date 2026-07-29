import { useRef, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
  LayoutChangeEvent,
} from "react-native";
import { useTheme } from "../providers/ThemeProvider";
import { useGameStore } from "../../stores/gameStore";
import type { BoardWord } from "../../../domain/entities/board";

interface CluePanelProps {
  word: BoardWord | null;
  wordIndex: number | null;
}

const PAGES = ["clue1", "clue2", "clue3", "reveal"] as const;
type PageId = (typeof PAGES)[number];

export default function CluePanel({ word, wordIndex }: CluePanelProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [activePage, setActivePage] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const hints = useGameStore((s) => s.hints);
  const useClue2 = useGameStore((s) => s.useClue2);
  const useClue3 = useGameStore((s) => s.useClue3);
  const revealLetter = useGameStore((s) => s.revealLetter);
  const goToPrevWord = useGameStore((s) => s.goToPrevWord);
  const goToNextWord = useGameStore((s) => s.goToNextWord);

  // Reset carousel when word changes
  useEffect(() => {
    setActivePage(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [wordIndex]);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (carouselWidth <= 0) return;
      const page = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
      setActivePage(page);
    },
    [carouselWidth],
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setCarouselWidth(e.nativeEvent.layout.width);
  }, []);

  if (!word || wordIndex === null) {
    return (
      <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Pilih kata di papan
        </Text>
      </View>
    );
  }

  const hint = hints[wordIndex];
  const showClue2 = hint?.clue2Used;
  const showClue3 = hint?.clue3Used;

  const hasClue2 = !!word.clue_2;
  const hasClue3 = !!word.clue_3;

  // Determine which pages are available
  const pages: PageId[] = ["clue1"];
  if (hasClue2) pages.push("clue2");
  if (hasClue3) pages.push("clue3");
  pages.push("reveal");

  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
      {/* Top row: prev arrow + word info + page dots + next arrow */}
      <View style={styles.topRow}>
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={goToPrevWord}
          style={styles.navBtn}
        >
          <Text style={[styles.navBtnText, { color: theme.colors.primary }]}>◀</Text>
        </TouchableOpacity>

        <View style={[styles.wordChip, { backgroundColor: theme.colors.border }]}>
          <Text style={[styles.wordChipText, { color: theme.colors.text }]}>
            {word.word.length} → {word.orientation === "horizontal" ? "Mendatar" : "Menurun"}
          </Text>
        </View>

        <View style={styles.dots}>
          {pages.map((p, i) => {
            const isActive = i === activePage;
            const isLocked =
              (p === "clue2" && !showClue2) ||
              (p === "clue3" && !showClue3);
            return (
              <View
                key={p}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : isLocked
                        ? theme.colors.border
                        : theme.colors.textSecondary,
                    width: isActive ? 20 : 6,
                  },
                ]}
              />
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.5}
          onPress={goToNextWord}
          style={styles.navBtn}
        >
          <Text style={[styles.navBtnText, { color: theme.colors.primary }]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Carousel area */}
      <View style={styles.carouselContainer} onLayout={handleLayout}>
        {carouselWidth > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            bounces={false}
            onMomentumScrollEnd={handleScroll}
            style={styles.scrollView}
          >
            {/* Page: Clue 1 */}
            <View style={[styles.page, { width: carouselWidth }]}>
              <Text style={[styles.clueLabel, { color: theme.colors.primary }]}>
                Petunjuk 1
              </Text>
              <Text
                style={[styles.clueText, { color: theme.colors.text }]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {word.clue_1}
              </Text>
            </View>

            {/* Page: Clue 2 */}
            {hasClue2 && (
              <View style={[styles.page, { width: carouselWidth }]}>
                {showClue2 ? (
                  <>
                    <Text style={[styles.clueLabel, { color: theme.colors.primary }]}>
                      Petunjuk 2
                    </Text>
                    <Text
                      style={[styles.clueText, { color: theme.colors.text }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {word.clue_2}
                    </Text>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.unlockBtn, { borderColor: theme.colors.primary }]}
                    activeOpacity={0.6}
                    onPress={() => useClue2(wordIndex)}
                  >
                    <Text style={[styles.unlockBtnText, { color: theme.colors.primary }]}>
                      Buka Petunjuk 2 (-50 XP)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Page: Clue 3 */}
            {hasClue3 && (
              <View style={[styles.page, { width: carouselWidth }]}>
                {showClue3 ? (
                  <>
                    <Text style={[styles.clueLabel, { color: theme.colors.primary }]}>
                      Petunjuk 3
                    </Text>
                    <Text
                      style={[styles.clueText, { color: theme.colors.text }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {word.clue_3}
                    </Text>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.unlockBtn, { borderColor: theme.colors.primary }]}
                    activeOpacity={0.6}
                    onPress={() => useClue3(wordIndex)}
                  >
                    <Text style={[styles.unlockBtnText, { color: theme.colors.primary }]}>
                      Buka Petunjuk 3 (-100 XP)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Page: Reveal Letter */}
            <View style={[styles.page, { width: carouselWidth }]}>
              <TouchableOpacity
                style={[styles.revealBtn, { borderColor: theme.colors.primary }]}
                activeOpacity={0.6}
                onPress={() => revealLetter(wordIndex)}
              >
                <Text style={[styles.revealBtnText, { color: theme.colors.primary }]}>
                  🔍 Buka Huruf (-75 XP)
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 76,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  navBtn: {
    width: 30,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  wordChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  wordChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  carouselContainer: {
    height: 36,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  page: {
    justifyContent: "center",
    paddingRight: 4,
  },
  clueLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 1,
  },
  clueText: {
    fontSize: 13,
    lineHeight: 17,
  },
  unlockBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  unlockBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  revealBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
  },
  revealBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
