import React, { useState, useEffect } from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { isDesktop } from './utils/responsive';
import { useTheme } from './utils/ThemeContext';
import { getAnnouncements, getTenantNotifications } from './services/dataService';
import { getLastSeen, getAnnouncementTime } from './utils/announcementSeen';

// Import header component
import TenantHeader from './components/TenantHeader';

// Import screens
import TenantHomeScreen from './screens/tenant/TenantHomeScreen';
import TenantComplaintsScreen from './screens/tenant/TenantComplaintsScreen';
import TenantUpdatesScreen from './screens/tenant/TenantUpdatesScreen';
import TenantFinancesScreen from './screens/tenant/TenantFinancesScreen';
import TenantNotificationsScreen from './screens/tenant/TenantNotificationsScreen';
import TenantBottomNav from './components/TenantBottomNav';

export default function TenantApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home');
  const { isDark, toggleTheme, colors } = useTheme();

    const [notificationBadge, setNotificationBadge] = useState(0);

  useEffect(() => {
    let active = true;
    const refreshBadge = async () => {
      if (activeScreen === 'notifications') {
        setNotificationBadge(0);
        return;
      }
      try {
        const uid = user?.uid || user?.tenant_id;
        const tenantId = user?.tenant_id || user?.room || '2';
        const [announcements, notifications, lastSeen] = await Promise.all([
          getAnnouncements().catch(() => []),
          getTenantNotifications(tenantId).catch(() => []),
          getLastSeen(uid),
        ]);
        const newAnnouncements = (announcements || []).filter((a) => getAnnouncementTime(a) > lastSeen).length;
        const unreadNotifications = (notifications || []).filter((n) => !n.read).length;
        if (active) setNotificationBadge(newAnnouncements + unreadNotifications);
      } catch {
        if (active) setNotificationBadge(0);
      }
    };
    refreshBadge();
    return () => {
      active = false;
    };
  }, [activeScreen, user?.uid, user?.tenant_id]);

  const getScreenTitle = () => {
    switch (activeScreen) {
      case 'home':
        return 'Home';
      case 'complaints':
        return 'Complaints';
      case 'updates':
        return 'Updates';
      case 'finances':
        return 'My Finances';
      case 'notifications':
        return 'Notifications';
      default:
        return 'Home';
    }
  };

  const getScreenSubtitle = () => {
    // Show date subtitle for Home screen
    if (activeScreen === 'home') {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return null;
  };

  const renderScreen = () => {
    switch (activeScreen) {
      case 'home':
        return <TenantHomeScreen user={user} onNavigateToUpdates={() => setActiveScreen('updates')} />;
      case 'complaints':
        return <TenantComplaintsScreen user={user} />;
      case 'updates':
        return <TenantUpdatesScreen />;
      case 'finances':
        return <TenantFinancesScreen user={user} />;
      case 'notifications':
        return <TenantNotificationsScreen user={user} />;
      default:
        return <TenantHomeScreen user={user} onNavigateToUpdates={() => setActiveScreen('updates')} />;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.card} />

      {/* Unified Header */}
      <TenantHeader
        title={getScreenTitle()}
        subtitle={getScreenSubtitle()}
        onLogout={onLogout}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <TenantBottomNav user={user} activeScreen={activeScreen} onNavigate={setActiveScreen} badges={{ notifications: notificationBadge }} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <TenantBottomNav user={user} activeScreen={activeScreen} onNavigate={setActiveScreen} badges={{ notifications: notificationBadge }} />
        </>
      )}
    </View>
  );
}
