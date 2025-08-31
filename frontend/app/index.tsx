import { Redirect } from 'expo-router';

export default function Index() {
  // Aquí puedes agregar lógica para verificar si el usuario está autenticado
  const isAuthenticated = true; // Cambia esto por tu lógica de autenticación real
  
  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }
  
  return <Redirect href="/(auth)/sign-in" />;
}