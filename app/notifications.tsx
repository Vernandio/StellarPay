import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../src/constants/colors';
import { Typography } from '../src/constants/typography';
import { Spacing } from '../src/constants/spacing';
import { FlashList } from '@shopify/flash-list';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function NotificationsScreen() {
  const notifications = [
    {
      id: '1',
      title: 'Payment Received',
      message: 'Alex sent you 50.00 USDC.',
      time: '2 mins ago',
      type: 'receive',
      icon: 'download',
      color: '#000',
      unread: true,
    },
    {
      id: '2',
      title: 'Split Bill Request',
      message: 'Sarah requested $15.50 for Dinner.',
      time: '1 hour ago',
      type: 'request',
      icon: 'users',
      color: '#000',
      unread: true,
    },
    {
      id: '3',
      title: 'Security Alert',
      message: 'New login from Mac OS (Chrome).',
      time: 'Yesterday, 4:20 PM',
      type: 'security',
      icon: 'shield',
      color: '#000',
      unread: false,
    },
    {
      id: '4',
      title: 'Swap Successful',
      message: 'Successfully swapped 100 XLM to USDC.',
      time: 'Yesterday, 2:10 PM',
      type: 'swap',
      icon: 'refresh-cw',
      color: '#000',
      unread: false,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.baseLight }} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: Spacing.lg, height: 56, backgroundColor: Colors.baseLight, borderBottomWidth: 1, borderBottomColor: Colors.borderLight }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "flex-start" }}>
          <Feather name="chevron-left" size={28} color={Colors.textLightPrimary} />
        </Pressable>
        <Text style={[Typography.headingLarge, { color: Colors.textLightPrimary, fontWeight: "700", fontSize: 18 }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={{ flex: 1 }}>
        <FlashList
          data={notifications}
          keyExtractor={(item) => item.id}
          // @ts-ignore
          estimatedItemSize={85}
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.duration(300).delay(index * 50)}>
              <Pressable style={{
                flexDirection: 'row',
                backgroundColor: item.unread ? '#F0F9FF' : Colors.white,
                padding: Spacing.lg,
                borderRadius: 16,
                marginBottom: Spacing.md,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
                elevation: 2,
                borderWidth: 1,
                borderColor: item.unread ? '#BFE4FF' : Colors.borderLight
              }}>
                <View style={{ 
                  width: 48, height: 48, borderRadius: 24, 
                  backgroundColor: item.unread ? Colors.white : Colors.baseLight, 
                  justifyContent: 'center', alignItems: 'center', 
                  marginRight: Spacing.md 
                }}>
                  <Feather name={item.icon as any} size={20} color={item.color} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={[Typography.labelLarge, { color: Colors.textLightPrimary, fontWeight: "700" }]}>{item.title}</Text>
                    {item.unread && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary }} />
                    )}
                  </View>
                  <Text style={[Typography.bodyMedium, { color: Colors.textLightSecondary, marginBottom: Spacing.xs }]}>{item.message}</Text>
                  <Text style={[Typography.labelSmall, { color: Colors.textLightSecondary, fontSize: 11 }]}>{item.time}</Text>
                </View>
              </Pressable>
            </Animated.View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
