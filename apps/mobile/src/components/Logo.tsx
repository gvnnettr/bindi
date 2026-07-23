import { Image, StyleSheet, View } from 'react-native';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';

const source = require('../../assets/bindi-logo.png');

interface LogoProps {
  height?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
}

export function Logo({ height = 40, style, imageStyle }: LogoProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Image
        source={source}
        style={[{ height, aspectRatio: 1500 / 1000, resizeMode: 'contain' }, imageStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
