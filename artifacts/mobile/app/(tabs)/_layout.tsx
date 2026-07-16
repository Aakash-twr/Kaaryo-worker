import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import type { SFSymbol } from "expo-symbols";
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="jobs">
        <Icon sf={{ default: "briefcase", selected: "briefcase.fill" }} />
        <Label>Jobs</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="earnings">
        <Icon
          sf={{
            default: "indianrupeesign.circle",
            selected: "indianrupeesign.circle.fill",
          }}
        />
        <Label>Earnings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

type TabConfig = {
  name: string;
  label: string;
  symbol: SFSymbol;
  symbolFilled: SFSymbol;
  feather: React.ComponentProps<typeof Feather>["name"];
};

const TABS: TabConfig[] = [
  {
    name: "index",
    label: "Home",
    symbol: "house",
    symbolFilled: "house.fill",
    feather: "home",
  },
  {
    name: "jobs",
    label: "Jobs",
    symbol: "briefcase",
    symbolFilled: "briefcase.fill",
    feather: "briefcase",
  },
  {
    name: "earnings",
    label: "Earnings",
    symbol: "indianrupeesign.circle",
    symbolFilled: "indianrupeesign.circle.fill",
    feather: "dollar-sign",
  },
  {
    name: "profile",
    label: "Profile",
    symbol: "person",
    symbolFilled: "person.fill",
    feather: "user",
  },
];

/**
 * A single tab: dot indicator, icon, and label stacked and centered. The dot
 * keeps its slot (transparent when inactive) so nothing shifts on selection.
 */
function TabItem({ config, focused }: { config: TabConfig; focused: boolean }) {
  const colors = useColors();
  const isIOS = Platform.OS === "ios";
  const tint = focused ? colors.primary : colors.mutedForeground;

  return (
    <View style={tabStyles.item}>
      <View
        style={[tabStyles.dot, focused && { backgroundColor: colors.primary }]}
      />
      {isIOS ? (
        <SymbolView
          name={focused ? config.symbolFilled : config.symbol}
          tintColor={tint}
          size={23}
        />
      ) : (
        <Feather name={config.feather} size={22} color={tint} />
      )}
      <Text
        style={[
          tabStyles.label,
          {
            color: tint,
            fontFamily: focused ? "Inter_600SemiBold" : "Inter_500Medium",
          },
        ]}
        numberOfLines={1}
      >
        {config.label}
      </Text>
    </View>
  );
}

/** Hide the floating bar while a keyboard is open, mirroring tabBarHideOnKeyboard. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvt, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

// Structural subset of BottomTabBarProps — the full props (which aren't
// resolvable as a top-level module here) are assignable to this.
type FloatingTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string; params?: object }[];
  };
  navigation: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    emit: (event: any) => any;
    navigate: (name: string, params?: object) => void;
  };
};

function FloatingTabBar({ state, navigation }: FloatingTabBarProps) {
  const colors = useColors();
  const { colorScheme } = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardVisible();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";

  if (keyboardVisible) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}
    >
      <View
        style={[
          styles.bar,
          {
            borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.border,
            backgroundColor: isIOS ? "transparent" : colors.card,
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: isDark ? 0.4 : 0.12,
                shadowRadius: 24,
              },
              android: { elevation: 8 },
              default: {},
            }),
          },
        ]}
      >
        {isIOS && (
          <BlurView
            intensity={70}
            tint={isDark ? "dark" : "light"}
            style={[StyleSheet.absoluteFill, styles.barClip]}
          />
        )}
        {state.routes.map((route, index) => {
          const config = TABS.find((t) => t.name === route.name);
          if (!config) return null;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={config.label}
              style={styles.pressable}
            >
              <TabItem config={config} focused={focused} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ClassicTabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="jobs" options={{ title: "Jobs" }} />
      <Tabs.Screen name="earnings" options={{ title: "Earnings" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const BAR_HEIGHT = 68;

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  bar: {
    flexDirection: "row",
    alignItems: "stretch",
    height: BAR_HEIGHT,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  barClip: { borderRadius: 26, overflow: "hidden" },
  pressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

const tabStyles = StyleSheet.create({
  item: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "transparent",
  },
  label: { fontSize: 11, letterSpacing: 0.1 },
});
