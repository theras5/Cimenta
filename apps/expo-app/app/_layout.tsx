// import { Stack } from "expo-router"
// import "./global.css"

// export default function RootLayout() {
//   return (
//     <Stack screenOptions={{headerShown: false}}/>
//   )
// }

import { Stack } from "expo-router";
import { AuthProvider } from "@/context/AuthContext"; // ✅ VERIFICAR este import
import "./global.css";

export default function RootLayout() {
  return (
    <AuthProvider> {/* ✅ DEBE estar aquí */}
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}