import React, { useState } from "react";
import { TextInput, View, Text, StyleSheet, ViewStyle } from "react-native";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing, Radius } from "../../constants/spacing";

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  style?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  secureTextEntry,
  keyboardType,
  autoCapitalize = "none",
  error,
  style,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={[Typography.labelSmall, styles.label]}>{label}</Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          error && styles.inputError,
        ]}
      />
      {error && (
        <Text style={[Typography.bodySmall, styles.error]}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: "#13122A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: Radius.md,
    height: 56,
    paddingHorizontal: Spacing.md,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  inputFocused: {
    borderColor: Colors.borderFocus,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  error: {
    color: Colors.danger,
    marginTop: Spacing.xs,
  },
});
