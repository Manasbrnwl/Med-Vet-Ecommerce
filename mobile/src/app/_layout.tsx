import { useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "../theme";

export default function RootLayout() {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
      })
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: "800" },
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="product/[slug]" options={{ title: "" }} />
          <Stack.Screen name="auth/login" options={{ title: "Sign in", presentation: "modal" }} />
          <Stack.Screen name="auth/register" options={{ title: "Create account", presentation: "modal" }} />
          <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
          <Stack.Screen name="orders/[id]" options={{ title: "Order" }} />
          <Stack.Screen name="account/orders" options={{ title: "My orders" }} />
          <Stack.Screen name="account/profile" options={{ title: "Profile" }} />
          <Stack.Screen name="account/addresses" options={{ title: "Addresses" }} />
        </Stack>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
