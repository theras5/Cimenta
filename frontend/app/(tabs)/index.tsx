import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import BoardCard from '../../components/BoardCard';
import ShortcutCard from '../../components/ShortcutCard';

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

// Define el tipo de las rutas de tu stack/tab
type RootStackParamList = {
  'tasks/new-task': undefined;
  // Agrega aquí las rutas que uses en navigation.navigate
};

type Props = NativeStackScreenProps<RootStackParamList, 'tasks/new-task'>;

export default function HomeScreen({ navigation }: Props) {
    const navigateToTasks = () => {
    router.push("/(tabs)/tasks");
  };

  const navigateToChanges = () => {
  router.push("/changes/changes"); 
  };

  const navigateToPurchases = () => {
    router.push("/purchases/purchases"); // Ahora apunta al archivo purchases.tsx
  };

  // Funciones para los atajos
  const navigateToNewTask = () => {
    router.push("/tasks/new-task");
  };

  const navigateToNewPurchase = () => {
    // Asumiendo que crearás esta ruta en el futuro
    router.push("/purchases/new-purchase");
  };

  const navigateToNewChange = () => {
    // Asumiendo que crearás esta ruta en el futuro
    router.push("/changes/new-change");
  };
  /*return (
    <ScrollView className="flex-1 bg-white px-6 pt-20">
      <Text className="text-2xl font-bold text-center mb-6">Inicio</Text>
      <Text className="text-lg font-bold mb-2">Tableros</Text>
      <View>
        <BoardCard
          icon={require('../../assets/icons/task.png')}
          title="Seguimiento de tareas"
          subtitle="Abierto hace 2 días"
        />
        <BoardCard
          icon={require('../../assets/icons/change.png')}
          title="Solicitudes de cambios"
          subtitle="Abierto hace 2 días"
        />
        <BoardCard
          icon={require('../../assets/icons/shopping-cart.png')}
          title="Seguimiento de compra"
          subtitle="Abierto hace 2 días"
        />
      </View>
      <Text className="text-lg font-bold mt-6 mb-2">Atajos</Text>
      <View className="flex-row justify-around mb-8">
        <ShortcutCard
          icon={require('../../assets/icons/task-icon.png')}
          label="Crear tarea"
          onPress={() => navigation.navigate('tasks/new-task')}
        />
        <ShortcutCard
          icon={require('../../assets/icons/shopping-cart-icon.png')}
          label="Crear solicitud de compra"
          onPress={() => {/* navegación a solicitud de compra }}
        />
        <ShortcutCard
          icon={require('../../assets/icons/change-icon.png')}
          label="Crear solicitud de cambio"
          onPress={() => {/* navegación a solicitud de cambio }}
        />
      </View>
    </ScrollView>
  );*/
  return (
    <ScrollView className="flex-1 bg-gray-50 px-6 pt-20">
      <Text className="text-2xl font-bold text-left mb-6">Inicio</Text>
      <Text className="text-lg font-bold mb-2">Tableros</Text>
      <View>
        {/* Tablero de tareas */}
        <TouchableOpacity onPress={navigateToTasks} activeOpacity={0.7}>
          <BoardCard
            icon={require('../../assets/icons/task.png')}
            title="Seguimiento de tareas"
            subtitle="Abierto hace 2 días"
          />
        </TouchableOpacity>

        {/* Tablero de cambios */}
        <TouchableOpacity onPress={navigateToChanges} activeOpacity={0.7}>
          <BoardCard
            icon={require('../../assets/icons/change.png')}
            title="Solicitudes de cambios"
            subtitle="Abierto hace 2 días"
          />
        </TouchableOpacity>

        {/* Tablero de compras */}
        <TouchableOpacity onPress={navigateToPurchases} activeOpacity={0.7}>
          <BoardCard
            icon={require('../../assets/icons/shopping-cart.png')}
            title="Seguimiento de compra"
            subtitle="Abierto hace 2 días"
          />
        </TouchableOpacity>
      </View>

      <Text className="text-lg font-bold mt-6 mb-2">Atajos</Text>
      <View className="flex-row justify-around mb-8">
        <ShortcutCard
          icon={require('../../assets/icons/task-icon.png')}
          label="Crear tarea"
          onPress={navigateToNewTask}
        />
        <ShortcutCard
          icon={require('../../assets/icons/shopping-cart-icon.png')}
          label="Crear solicitud de compra"
          onPress={navigateToNewPurchase}
        />
        <ShortcutCard
          icon={require('../../assets/icons/change-icon.png')}
          label="Crear solicitud de cambio"
          onPress={navigateToNewChange}
        />
      </View>
    </ScrollView>
  );
}