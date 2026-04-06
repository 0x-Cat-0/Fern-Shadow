import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, layout } from '../theme/spacing';
import { typography } from '../theme/typography';

interface CardProps {
  coverImagePath: string;
  title: string;
  description?: string;
  subtitle?: string;
  onPress?: () => void;
  style?: ViewStyle;
  showSubtitle?: boolean;
}

export function Card({
  coverImagePath,
  title,
  description,
  subtitle,
  onPress,
  style,
  showSubtitle = false,
}: CardProps) {
  const colors = useTheme();

  const content = (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface },
        style,
      ]}
    >
      <Image
        source={{ uri: coverImagePath }}
        style={styles.coverImage}
        resizeMode="cover"
      />
      <View style={styles.content}>
        <Text
          style={[styles.title, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {description ? (
          <Text
            style={[styles.description, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {description}
          </Text>
        ) : null}
        {showSubtitle && subtitle ? (
          <Text
            style={[styles.subtitle, { color: colors.textDisabled }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: layout.cardRadius,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  coverImage: {
    width: '100%',
    aspectRatio: layout.imageAspectRatio,
  },
  content: {
    padding: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    marginTop: spacing.xs,
  },
});