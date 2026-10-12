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
import TenantSettingsScreen from './screens/tenant/TenantSettingsScreen';
import TenantBottomNav from './components/TenantBottomNav';

export default function TenantApp({ user, onLogout }) {
  const [activeScreen, setActiveScreen] = useState('home');
  const [tenantUser, setTenantUser] = useState(user);
  const { isDark, toggleTheme, colors } = useTheme();

  const [notificationBadge, setNotificationBadge] = useState(0);

  useEffect(() => setTenantUser(user), [user]);

  useEffect(() => {
    let active = true;
    const refreshBadge = async () => {
      if (activeScreen === 'notifications') {
        setNotificationBadge(0);
        return;
      }
      try {
        const uid = tenantUser?.uid || tenantUser?.tenant_id;
        const tenantId = tenantUser?.tenant_id || tenantUser?.room || '2';
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
  }, [activeScreen, tenantUser?.uid, tenantUser?.tenant_id]);

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
      case 'settings':
        return 'Settings';
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
        return <TenantHomeScreen user={tenantUser} onNavigateToUpdates={() => setActiveScreen('updates')} />;
      case 'complaints':
        return <TenantComplaintsScreen user={tenantUser} />;
      case 'updates':
        return <TenantUpdatesScreen />;
      case 'finances':
        return <TenantFinancesScreen user={tenantUser} />;
      case 'notifications':
        return <TenantNotificationsScreen user={tenantUser} />;
      case 'settings':
        return <TenantSettingsScreen
          user={tenantUser}
          onBack={() => setActiveScreen('home')}
          onUserUpdated={(updates) => setTenantUser((current) => ({ ...current, ...updates }))}
        />;
      default:
        return <TenantHomeScreen user={tenantUser} onNavigateToUpdates={() => setActiveScreen('updates')} />;
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
        onSettingsPress={() => setActiveScreen('settings')}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />

      {isDesktop ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <TenantBottomNav user={tenantUser} activeScreen={activeScreen} onNavigate={setActiveScreen} badges={{ notifications: notificationBadge }} />
          <View style={{ flex: 1 }}>{renderScreen()}</View>
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>{renderScreen()}</View>
          <TenantBottomNav user={tenantUser} activeScreen={activeScreen} onNavigate={setActiveScreen} badges={{ notifications: notificationBadge }} />
        </>
      )}
    </View>
  );
}
