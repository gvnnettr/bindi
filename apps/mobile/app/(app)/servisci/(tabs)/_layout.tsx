import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';
import { colors } from '../../../../src/theme/colors';

function TabIcon({ children, focused }: { children: React.ReactNode; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', width: 30 }}>
      <View
        style={{
          position: 'absolute',
          top: -14,
          width: 22,
          height: 3,
          borderRadius: 2,
          backgroundColor: focused ? colors.primary : 'transparent',
        }}
      />
      {children}
    </View>
  );
}

const stroke = 1.9;

export default function ServisciTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.dark,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: '#fff',
          height: 84,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <Path d="M9 22V12h6v10" />
              </Svg>
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="talepler"
        options={{
          title: 'Talepler',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
                <Polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                <Path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
              </Svg>
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="kazanc-raporu"
        options={{
          title: 'Ödemeler',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
                <Path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
                <Path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
              </Svg>
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Ben',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <Circle cx="12" cy="7" r="4" />
              </Svg>
            </TabIcon>
          ),
        }}
      />
    </Tabs>
  );
}
