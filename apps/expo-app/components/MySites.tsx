// import React from "react";
// import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
// import { useRouter } from "expo-router";

// const obras = [
//   { id: 1, nombre: "Guemes 2018" },
//   { id: 2, nombre: "Nicaragua 4395" },
//   { id: 3, nombre: "Amenabar 2859" },
// ];

// export default function MySitesScreen() {
//   const router = useRouter();

//   return (
//     <ScrollView contentContainerStyle={styles.container}>
//       <Text style={styles.title}>Mis Obras</Text>
//       <View style={styles.separator} />
//       {obras.map((obra) => (
//         <TouchableOpacity key={obra.id} style={styles.obraButton}>
//           <Text style={styles.obraText}>{obra.nombre}</Text>
//         </TouchableOpacity>
//       ))}
//       <TouchableOpacity style={styles.addButton}>
//         <Text style={styles.addText}>Añadir obra</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={styles.allButton}
//         onPress={() => router.push("/todas-obras")}
//       >
//         <Text style={styles.allText}>Todas las obras →</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flexGrow: 1,
//     alignItems: "center",
//     paddingTop: 60,
//     backgroundColor: "#fff",
//   },
//   title: {
//     fontSize: 24,
//     fontWeight: "bold",
//     marginBottom: 8,
//   },
//   separator: {
//     height: 2,
//     backgroundColor: "#F25C5C",
//     width: "90%",
//     marginBottom: 24,
//   },
//   obraButton: {
//     backgroundColor: "#2B44FF",
//     borderRadius: 8,
//     paddingVertical: 14,
//     paddingHorizontal: 40,
//     marginBottom: 16,
//     width: "80%",
//     alignItems: "center",
//   },
//   obraText: {
//     color: "#fff",
//     fontSize: 18,
//     fontWeight: "bold",
//   },
//   addButton: {
//     borderColor: "#2B44FF",
//     borderWidth: 2,
//     borderRadius: 8,
//     paddingVertical: 14,
//     paddingHorizontal: 40,
//     marginBottom: 24,
//     width: "80%",
//     alignItems: "center",
//   },
//   addText: {
//     color: "#2B44FF",
//     fontSize: 18,
//     fontWeight: "bold",
//   },
//   allButton: {
//     borderColor: "#2B44FF",
//     borderWidth: 1,
//     borderRadius: 8,
//     paddingVertical: 10,
//     paddingHorizontal: 24,
//     width: "80%",
//     alignItems: "center",
//   },
//   allText: {
//     color: "#2B44FF",
//     fontSize: 16,
//     fontWeight: "bold",
//   },
// });