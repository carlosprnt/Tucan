import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

// Placeholder route — replaced by the auth gate / Today screen in later steps.
// For now it verifies that theming (light/dark tokens) is wired correctly.
export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Tucan</Text>
      <Text style={styles.subtitle}>Foundation ready</Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space.sm,
  },
  brand: {
    fontSize: theme.font.display,
    fontWeight: theme.weight.bold,
    letterSpacing: -1,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.font.body,
    color: theme.colors.textSecondary,
  },
}));
