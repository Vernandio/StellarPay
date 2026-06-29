// TODO: Implement recipient search with Firestore lookup
import React from "react";
import { View, Text } from "react-native";
import { Input } from "../ui/Input";
import { Colors } from "../../constants/colors";
import { Typography } from "../../constants/typography";
import { Spacing } from "../../constants/spacing";

interface RecipientSearchProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const RecipientSearch: React.FC<RecipientSearchProps> = ({ value, onChangeText }) => {
  return (
    <View>
      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder="Enter username or Stellar address"
        label="RECIPIENT"
        autoCapitalize="none"
      />
    </View>
  );
};
