import { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRootNavigationState, useRouter } from 'expo-router';
import { PUBLIC_HOME_ROUTE } from '@/utils/authNavigation';

const LOGO_IN_MS = 700;
const LOGO_HOLD_MS = 1500;

/** Splash ToubCar → catalogue public. Pas de fade vers le blanc : on navigue pendant que le logo est visible. */
export default function SplashScreen() {
  const router = useRouter();
  const rootState = useRootNavigationState();
  const didNavigate = useRef(false);

  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!rootState?.key) return;

    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: LOGO_IN_MS,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      if (didNavigate.current) return;
      didNavigate.current = true;
      if (router.canDismiss()) {
        router.dismissAll();
      }
      router.replace(PUBLIC_HOME_ROUTE);
    }, LOGO_IN_MS + LOGO_HOLD_MS);

    return () => clearTimeout(timer);
  }, [rootState?.key, router, logoScale, logoOpacity]);

  return (
    <Animated.View style={styles.container}>
      <LinearGradient
        colors={['#F0F8FF', '#D6EAF8', '#AED6F1']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <Animated.View
        style={{
          opacity: logoOpacity,
          transform: [{ scale: logoScale }],
        }}
      >
        <Image
          source={require('../assets/toubcar-logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 240,
    height: 240,
  },
});
