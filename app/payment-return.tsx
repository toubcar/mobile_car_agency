import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { COLORS } from '@/constants/api';

// In the browser version, PayPal's window lands here: it hands the address back to the app and closes
WebBrowser.maybeCompleteAuthSession();

/**
 * Where PayPal sends the customer back (toubcar://payment-return?status=…&booking=…). The in-app browser normally
 * catches this address itself; when the phone opens the app with it instead, this screen leads to the booking.
 */
export default function PaymentReturnScreen() {
  const router = useRouter();
  const { booking } = useLocalSearchParams<{ booking?: string; status?: string }>();

  useEffect(() => {
    if (router.canGoBack()) {
      router.back();
    } else if (booking && /^\d+$/.test(booking)) {
      router.replace(`/booking/${booking}`);
    } else {
      router.replace('/(tabs)/bookings');
    }
  }, [booking, router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color={COLORS.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background } });
