import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";
import { getServiceById } from "@/constants/services";

interface ServiceIconProps {
  serviceType: string;
  size?: number;
  iconSize?: number;
}

export function ServiceIcon({ serviceType, size = 44, iconSize = 22 }: ServiceIconProps) {
  const service = getServiceById(serviceType);
  const color = service?.color ?? "#6B7280";
  const lightColor = service?.lightColor ?? "#F3F4F6";
  const icon = (service?.icon ?? "tool") as any;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2.5, backgroundColor: lightColor },
      ]}
    >
      <Feather name={icon} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
