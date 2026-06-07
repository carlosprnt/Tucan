import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

// Placeholder create sheet — the full form (name, icon, color, start date) and
// onboarding suggestions are built in the next step.
export default function NewHabit() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>New habit</Text>
      <Text style={styles.body}>The create form is coming next.</Text>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => router.back()}>
        <Text style={styles.buttonText}>Close</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    padding: theme.space.xl,
    paddingTop: rt.insets.top + theme.space.xxl,
    gap: theme.space.sm,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: theme.weight.bold,
    color: theme.colors.textPrimary,
  },
  body: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
  button: {
    marginTop: theme.space.xl,
    height: 52,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: theme.font.body,
    fontWeight: theme.weight.semibold,
    color: theme.colors.textPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
}));
