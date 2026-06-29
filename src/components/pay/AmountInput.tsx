// TODO: Implement full amount input with currency selector
import React from "react";
import { View, Text } from "react-native";
import { Input } from "../ui/Input";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing } from "../../constants/spacing";

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  asset?: "XLM" | "USDC";
}

export const AmountInput: React.FC<AmountInputProps> = ({ value, onChangeText, asset = "USDC" }) => {
  return (
    <View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder="0.00"
        label={`AMOUNT (${asset})`}
        keyboardType="numeric"
      />
    </View>
  );
};
