import React from "react";
import { View, Text, Pressable, Modal, TouchableOpacity, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing } from "../../constants/spacing";

interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

const toInputValue = (d: Date) => {
  // yyyy-mm-dd in LOCAL time (not toISOString, which shifts to UTC and can
  // roll the date back/forward a day depending on timezone).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Date picker field, themed consistently across platforms:
 *  - Web: `@react-native-community/datetimepicker` has no web implementation
 *    (it silently renders nothing there), so we use a native HTML
 *    `<input type="date">` styled to match the app instead.
 *  - iOS/Android: the native picker, opened via modal (this component owns
 *    the whole open/close + value flow, unlike the old inline version).
 */
export function DateField({ label, value, onChange, minimumDate, maximumDate }: DateFieldProps) {
  const [visible, setVisible] = React.useState(false);

  const fieldButton = (
    <Pressable
      onPress={() => setVisible(true)}
      style={{
        flex: 1,
        backgroundColor: Colors.baseLight,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: value ? Colors.primary : Colors.borderLight,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 48,
      }}
    >
      <View>
        <Text style={[Typography.bodySmall, { color: Colors.textLightSecondary, fontSize: 11, marginBottom: 2 }]}>{label}</Text>
        <Text style={[Typography.labelLarge, { color: value ? Colors.textLightPrimary : Colors.textLightMuted, fontWeight: "600" }]}>
          {value ? value.toLocaleDateString() : "Select Date"}
        </Text>
      </View>
      <Feather name="calendar" size={14} color={value ? Colors.primary : Colors.textLightMuted} />
    </Pressable>
  );

  if (Platform.OS === "web") {
    return (
      <View style={{ flex: 1, position: "relative" }}>
        {fieldButton}
        {/* Transparent native date input overlaid on the styled button — gives
            us the real browser date picker (click-to-open, keyboard support)
            while keeping the app's visual design. */}
        <input
          type="date"
          value={value ? toInputValue(value) : ""}
          min={minimumDate ? toInputValue(minimumDate) : undefined}
          max={maximumDate ? toInputValue(maximumDate) : undefined}
          onChange={(e: any) => {
            if (!e.target.value) return;
            const [y, m, d] = e.target.value.split("-").map(Number);
            onChange(new Date(y, m - 1, d));
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            opacity: 0,
            cursor: "pointer",
            border: "none",
            padding: 0,
          }}
        />
      </View>
    );
  }

  // Lazily require so the native module never loads on web.
  const DateTimePicker = require("@react-native-community/datetimepicker").default;

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setVisible(false);
    if (selectedDate) onChange(selectedDate);
  };

  return (
    <>
      {fieldButton}
      {visible &&
        (Platform.OS === "ios" ? (
          <Modal transparent animationType="fade" visible={visible}>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)" }}>
              <View style={{ backgroundColor: Colors.white, borderRadius: 24, padding: Spacing.lg, width: "90%", alignItems: "center" }}>
                <Text style={[Typography.headingMedium, { color: Colors.textLightPrimary, marginBottom: Spacing.md, fontWeight: "700" }]}>
                  Select {label}
                </Text>
                <DateTimePicker
                  value={value || new Date()}
                  mode="date"
                  display="inline"
                  themeVariant="light"
                  accentColor={Colors.primary}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  onChange={handleChange}
                />
                <TouchableOpacity
                  onPress={() => setVisible(false)}
                  style={{ backgroundColor: "#111111", paddingVertical: 12, paddingHorizontal: Spacing.xl, borderRadius: 99, marginTop: Spacing.md, width: "100%", alignItems: "center" }}
                >
                  <Text style={[Typography.labelLarge, { color: Colors.white, fontWeight: "700" }]}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={value || new Date()}
            mode="date"
            display="default"
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
          />
        ))}
    </>
  );
}
