import { Stack } from "expo-router";
import React from "react";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="personal-details" />
      <Stack.Screen name="location" />
      <Stack.Screen name="aadhaar" />
      <Stack.Screen name="face-match" />
      <Stack.Screen name="work-details" />
      <Stack.Screen name="video-task" />
      <Stack.Screen name="video-upload" />
      <Stack.Screen name="references" />
      <Stack.Screen name="consent" />
      <Stack.Screen name="submitted" />
    </Stack>
  );
}
