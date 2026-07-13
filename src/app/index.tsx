/**
 * Root index — immediately redirects to the animated splash screen.
 * The splash then decides: /(app) if token exists, /(auth)/register otherwise.
 */

import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(auth)/splash" />;
}
