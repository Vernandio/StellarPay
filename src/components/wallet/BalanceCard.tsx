// TODO: Implement full BalanceCard component with count-up animation
import React from "react";
import { View, Text } from "react-native";
import { Card } from "../ui/Card";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing } from "../../constants/spacing";
import { formatAmount } from "../../utils/format";

interface BalanceCardProps {
  usdcBalance: string;
  xlmBalance: string;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({ usdcBalance, xlmBalance }) => {
  return (
    <Card glowing>
      <Text style={[Typography.labelSmall, { color: Colors.textMuted, marginBottom: Spacing.sm }]}>
        TOTAL BALANCE
      </Text>
      <Text style={[Typography.amount, { color: Colors.textPrimary, marginBottom: Spacing.md }]}>
        ${formatAmount(usdcBalance)}
      </Text>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <View>
          <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>USDC</Text>
          <Text style={[Typography.headingMedium, { color: Colors.textPrimary }]}>{formatAmount(usdcBalance)}</Text>
        </View>
        <View>
          <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>XLM</Text>
          <Text style={[Typography.headingMedium, { color: Colors.textPrimary }]}>{formatAmount(xlmBalance, "XLM", 4)}</Text>
        </View>
      </View>
    </Card>
  );
};
