import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../src/constants/colors";
import { View, StyleSheet, Platform } from "react-native";
import { WebSidebar } from "../../src/components/WebSidebar";
import { WEB_TAB_CONTENT_MAX_WIDTH } from "../../src/constants/layout";

const isWeb = Platform.OS === "web";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={isWeb ? (props) => <WebSidebar {...props} /> : undefined}
      screenLayout={
        isWeb
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
        tabBarPosition: isWeb ? "left" : "bottom",
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
