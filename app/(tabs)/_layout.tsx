import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../src/constants/colors";
import { View, StyleSheet, Platform, useWindowDimensions } from "react-native";
import { WebSidebar } from "../../src/components/WebSidebar";
import { WEB_TAB_CONTENT_MAX_WIDTH, WEB_DESKTOP_BREAKPOINT } from "../../src/constants/layout";

export default function TabsLayout() {
  // Reactive to browser resizes: a narrow web window (or an actual phone
  // browser) should fall back to the same bottom tab bar as native, not the
  // desktop sidebar. Sidebar is a viewport-width thing, not a platform thing.
  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === "web" && width >= WEB_DESKTOP_BREAKPOINT;

  return (
    <Tabs
      tabBar={isDesktopWeb ? (props) => <WebSidebar {...props} /> : undefined}
      screenLayout={
        isDesktopWeb
          ? ({ route, children }) => (
              <View style={styles.webContentOuter}>
                {route.name === "index" && (
                  // Full-width copy of the Home screen's header gradient so the
                  // dark band bleeds smoothly across the whole content area
                  // instead of being cut off at the clamped column's edges.
                  // Must match the gradient in app/(tabs)/index.tsx exactly.
                  <LinearGradient
                    colors={["#000000", "#111111", Colors.baseLight]}
                    locations={[0, 0.6, 1]}
                    style={styles.webHomeHeaderBleed}
                  />
                )}
                <View style={styles.webContentInner}>{children}</View>
              </View>
            )
          : undefined
      }
      screenOptions={{
        headerShown: false,
        tabBarPosition: isDesktopWeb ? "left" : "bottom",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "#000000", // Black
          borderTopWidth: 0,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          paddingTop: 8,
        },
        tabBarShowLabel: true,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#8E8CAE",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.2,
          marginTop: 2,
          marginBottom: 4,
        },
        tabBarItemStyle: {
          paddingTop: 5,
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Feather name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pay"
        options={{
          title: "Pay",
          tabBarIcon: ({ color, size }) => <Feather name="send" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: "QR",
          tabBarIcon: ({ focused }) => (
            <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "#000000",
                  justifyContent: "center",
                  alignItems: "center",
                  top: -20, // Make it pop out over the edge of the navbar
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 5,
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              >
                <Feather name="grid" size={26} color="#FFFFFF" />
              </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => <Feather name="file-text" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Feather name="user" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  webContentOuter: {
    flex: 1,
    alignItems: "center",
    // Matches every tab screen's root background so the margins beside the
    // clamped column read as one continuous page.
    backgroundColor: Colors.baseLight,
  },
  webContentInner: {
    flex: 1,
    width: "100%",
    maxWidth: WEB_TAB_CONTENT_MAX_WIDTH,
  },
  webHomeHeaderBleed: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
});
