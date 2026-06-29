// TODO: Implement full TransactionItem with relative time
import React from "react";
import { View, Text, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing } from "../../constants/spacing";
import { formatAmount, truncateAddress } from "../../utils/format";

interface TransactionItemProps {
  type: "send" | "receive" | "swap";
  amount: string;
  asset: string;
  counterparty: string;
  timestamp: Date;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  type,
  amount,
  asset,
  counterparty,
  timestamp,
}) => {
  const getIcon = (): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "send": return "arrow-up-right";
      case "receive": return "arrow-down-left";
      case "swap": return "repeat";
    }
  };

  const getColor = (): string => {
    switch (type) {
      case "send": return Colors.danger;
      case "receive": return Colors.teal;
      case "swap": return Colors.primary;
    }
  };

  const getLabel = (): string => {
    switch (type) {
      case "send": return "Sent";
      case "receive": return "Received";
      case "swap": return "Swapped";
    }
  };

  return (
    <Pressable
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: Spacing.md,
        borderBottomWidth: 0.5,
        borderBottomColor: Colors.border,
      }}
    >
      {/* Icon */}
      <View style={{
        width: 44,
        height: 44,
        borderRadius: 9999,
        backgroundColor: Colors.surface2,
        justifyContent: "center",
        alignItems: "center",
        marginRight: Spacing.md,
      }}>
        <Feather name={getIcon()} size={20} color={getColor()} />
      </View>

      {/* Details */}
      <View style={{ flex: 1 }}>
        <Text style={[Typography.labelLarge, { color: Colors.textPrimary }]}>
          {getLabel()}
        </Text>
        <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>
          {truncateAddress(counterparty)}
        </Text>
      </View>

      {/* Amount */}
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[Typography.labelLarge, { color: type === "receive" ? Colors.teal : Colors.textPrimary }]}>
          {type === "receive" ? "+" : "-"}{formatAmount(amount)} {asset}
        </Text>
        <Text style={[Typography.bodySmall, { color: Colors.textMuted }]}>
          {timestamp.toLocaleDateString()}
        </Text>
      </View>
    </Pressable>
  );
};
