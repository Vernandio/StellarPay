import { View, Text } from "react-native";
import { Colors } from "../../src/constants/colors";

export default function QRScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.base }}>
      <Text style={{ color: Colors.textPrimary }}>QR Scanner</Text>
    </View>
  );
}
