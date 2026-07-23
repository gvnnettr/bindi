import { Tabs } from 'expo-router';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../../src/theme/colors';

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

export default function VeliTabsLayout() {
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
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
        name="taleplerim"
        options={{
          title: 'Taleplerim',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8" />
              </Svg>
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="ogrencilerim"
        options={{
          title: 'Öğrenciler',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon focused={focused}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8z" />
              </Svg>
            </TabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="odemelerim"
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
      <Tabs.Screen name="talep-ac" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="talep/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="aile-uyeleri" options={{ href: null }} />
      <Tabs.Screen name="ayarlar/index" options={{ href: null }} />
      <Tabs.Screen name="puanla/[offerId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="servisci/[offerId]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="servis-takip" options={{ href: null }} />
    </Tabs>
  );
}
