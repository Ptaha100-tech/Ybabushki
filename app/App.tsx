import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { api, loadToken, setToken, User } from './src/api';
import AuthScreen from './src/screens/AuthScreen';
import ParentScreen from './src/screens/ParentScreen';
import StudentScreen from './src/screens/StudentScreen';
import TeacherScreen from './src/screens/TeacherScreen';
import { colors } from './src/ui';

export default function App() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

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
  };

  let body: React.ReactNode;
  if (!ready) {
    body = (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (!user) {
    body = <AuthScreen onAuth={setUser} />;
  } else if (user.role === 'student') {
    body = <StudentScreen user={user} onLogout={logout} />;
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
