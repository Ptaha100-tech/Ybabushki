import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api, loadToken, setToken, User } from './src/api';
import './src/install';
import AuthScreen from './src/screens/AuthScreen';
import InfoScreen, { InfoKind } from './src/screens/InfoScreen';
import LandingScreen from './src/screens/LandingScreen';
import ParentScreen from './src/screens/ParentScreen';
import StudentScreen from './src/screens/StudentScreen';
import TeacherScreen from './src/screens/TeacherScreen';
import { colors } from './src/ui';

type View_ = { name: 'landing' } | { name: 'auth'; mode: 'login' | 'register' } | { name: 'info'; kind: InfoKind };

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View_>({ name: 'landing' });
  const [back, setBack] = useState<View_>({ name: 'landing' });

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        try {
          setUser(await api.me());
        } catch {
          await setToken(null);
        }
      }
      setReady(true);
    })();
  }, []);

  const logout = async () => {
    await setToken(null);
    setUser(null);
    setView({ name: 'landing' });
  };

  const showInfo = (kind: InfoKind) => {
    setBack(view);
    setView({ name: 'info', kind });
  };

  let body: React.ReactNode;
  if (!ready) {
    body = (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (view.name === 'info') {
    body = <InfoScreen kind={view.kind} onBack={() => setView(user ? { name: 'landing' } : back)} />;
  } else if (!user) {
    body =
      view.name === 'auth' ? (
        <AuthScreen onAuth={setUser} initialMode={view.mode} onBack={() => setView({ name: 'landing' })} />
      ) : (
        <LandingScreen onStart={(mode) => setView({ name: 'auth', mode })} onInfo={showInfo} />
      );
  } else if (user.role === 'student') {
    body = <StudentScreen user={user} onLogout={logout} onInfo={showInfo} />;
  } else if (user.role === 'teacher') {
    body = <TeacherScreen user={user} onLogout={logout} />;
  } else {
    body = <ParentScreen user={user} onLogout={logout} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {body}
    </View>
  );
}
