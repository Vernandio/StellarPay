import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Colors } from "../constants/colors";
import { Spacing, Radius } from "../constants/spacing";
import { Typography } from "../constants/typography";
import { WEB_SIDEBAR_WIDTH } from "../constants/layout";

type IconName = React.ComponentProps<typeof Feather>["name"];

// Maps each (tabs) route name to the sidebar's own icon/label — independent of
// each screen's `tabBarIcon` option, since that's tailored to the mobile
// bottom bar (e.g. the QR tab's floating pop-out circle).
const NAV_ITEMS: Record<string, { label: string; icon: IconName }> = {
  index: { label: "Home", icon: "home" },
  pay: { label: "Pay", icon: "send" },
  qr: { label: "QR", icon: "grid" },
  activity: { label: "History", icon: "file-text" },
  profile: { label: "Profile", icon: "user" },
};

function SidebarNavItem({
  label,
  icon,
  focused,
  onPress,
}: {
  label: string;
  icon: IconName;
  focused: boolean;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={[styles.item, focused ? styles.itemFocused : hovered && styles.itemHovered]}
    >
      <Feather name={icon} size={20} color={focused ? Colors.white : Colors.textMuted} />
      <Text style={[styles.label, { color: focused ? Colors.white : Colors.textMuted }]}>{label}</Text>
    </Pressable>
  );
}

export function WebSidebar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.brandRow}>
        <Feather name="aperture" size={22} color={Colors.white} />
        <Text style={styles.brandText}>StellarPay</Text>
      </View>

      <View>
        {state.routes.map((route, index) => {
          const navItem = NAV_ITEMS[route.name];
          if (!navItem) return null;
          const focused = state.index === index;

          return (
            <SidebarNavItem
              key={route.key}
              label={navItem.label}
              icon={navItem.icon}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: WEB_SIDEBAR_WIDTH,
    backgroundColor: Colors.surface,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  brandText: {
    ...Typography.headingMedium,
    color: Colors.white,
    fontWeight: "700",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.xs,
  },
  itemFocused: {
    backgroundColor: "rgba(123, 97, 255, 0.16)",
  },
  itemHovered: {
    backgroundColor: Colors.surface2,
  },
  label: {
    ...Typography.bodyMedium,
    fontWeight: "600",
  },
});
