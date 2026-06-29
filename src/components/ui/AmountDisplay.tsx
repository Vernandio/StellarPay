import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { formatAmount } from "../../utils/format";

interface AmountDisplayProps {
  amount: string | number;
  currency?: string;
  size?: "sm" | "md" | "lg";
}

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  currency = "USDC",
  size = "lg",
}) => {
  const formatted = formatAmount(amount);
  const [integer, decimal] = formatted.split(".");

  const fontSize = size === "lg" ? 48 : size === "md" ? 32 : 20;

  return (
    <View style={styles.container}>
      <Text style={[Typography.amount, { fontSize, color: Colors.textPrimary }]}>
        {integer}
        <Text style={{ fontWeight: "600", fontSize: fontSize * 0.6 }}>
          .{decimal} {currency}
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "baseline",
  },
});
