import ScreenSkeleton from './components/ScreenSkeleton';
import React, { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { ThemeProvider } from './utils/ThemeContext';
import LoginScreen from './screens/auth/LoginScreen';
import LandlordApp from './LandlordApp';
import TenantApp from './TenantApp';
import { logout, subscribeToCurrentUser } from './services/authService';

function AppRouter() {
  const [currentUser, setCurrentUser] = useState(null); // null = unauthenticated
  const [checkingAuth, setCheckingAuth] = useState(true);
  useEffect(() => {
    let isMounted = true;
    let unsubscribeAuth = null;

    subscribeToCurrentUser((user) => {
      if (!isMounted) return;
      setCurrentUser(user);
      setCheckingAuth(false);
    }, () => {
      if (!isMounted) return;
      setCheckingAuth(false);
    }).then((unsubscribe) => {
      if (!isMounted) {
        unsubscribe();
        return;
      }

      unsubscribeAuth = unsubscribe;
    }).catch((error) => {
      console.warn('Firebase auth listener failed:', error.message);
      if (isMounted) setCheckingAuth(false);
    });

    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || (!checkingAuth && !currentUser)) return undefined;

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      BackHandler.exitApp();
      return true;
    });

    return () => backSubscription.remove();
  }, [checkingAuth, currentUser]);

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
  };

  if (checkingAuth) return <ScreenSkeleton />;

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={setCurrentUser} />;
  }

  // Landlord role consolidates owner and caretaker
  if (currentUser.role === 'landlord') {
    return <LandlordApp user={currentUser} onLogout={handleLogout} />;
  }

  if (currentUser.role === 'tenant') {
    return <TenantApp user={currentUser} onLogout={handleLogout} />;
  }

  return <LoginScreen onLoginSuccess={setCurrentUser} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AppRouter />
    </ThemeProvider>
  );
}

