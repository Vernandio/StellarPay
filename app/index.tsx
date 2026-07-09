import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "../src/hooks/useAuth";
import { Colors } from "../src/constants/colors";

export default function Index() {
  const { isAuthenticated, hasProfile, hasPin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.base }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    if (hasProfile) {
      if (hasPin) {
        // Force PIN verification before accessing the app
        return <Redirect href="/(auth)/pin-entry" />;
      } else {
        // Profile exists but PIN is not setup (e.g. account locked/reset)
        return <Redirect href={{ pathname: "/(auth)/login", params: { step: "forgot_send" } }} />;
      }
    } else {
      // Authenticated via social but username profile is not created yet
      return <Redirect href="/(auth)/signup" />;
    }
  }

  // Not authenticated
  return <Redirect href="/(auth)/landing" />;
}
