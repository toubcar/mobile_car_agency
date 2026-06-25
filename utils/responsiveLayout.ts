import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_HEIGHT = 58;
export const DEFAULT_MAX_WIDTH = 560;
export const PROFILE_MAX_WIDTH = 720;

type ResponsiveLayoutOptions = {
  maxWidth?: number;
  withTabBar?: boolean;
  bottomExtra?: number;
};

export function useResponsiveLayout(options: ResponsiveLayoutOptions = {}) {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const maxWidth = options.maxWidth ?? DEFAULT_MAX_WIDTH;
  const isCompact = screenW < 360;
  const isWide = screenW >= 600;
  const contentPad = Math.max(14, Math.round(screenW * 0.04));
  const contentWidth = Math.min(screenW, maxWidth);
  const cardGap = 12;
  const numColumns = isWide ? 2 : 1;
  const columnCardWidth =
    numColumns === 2
      ? (contentWidth - contentPad * 2 - cardGap) / 2
      : contentWidth - contentPad * 2;

  const bottomPad =
    (options.withTabBar ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom) +
    (options.bottomExtra ?? 16);

  const scrollContentStyle: ViewStyle = {
    paddingHorizontal: contentPad,
    paddingBottom: bottomPad,
    maxWidth,
    alignSelf: 'center',
    width: '100%',
  };

  return {
    screenW,
    screenH,
    insets,
    isCompact,
    isWide,
    contentPad,
    contentWidth,
    bottomPad,
    maxWidth,
    scrollContentStyle,
    headerGradientHeight: isCompact ? 140 : isWide ? 200 : 160,
    numColumns,
    cardGap,
    columnCardWidth,
  };
}
