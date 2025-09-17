import { View, Text, TouchableOpacity, ScrollView } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import RequiredTextInput from '@/components/RequiredTextInput'


const NewUpdate = () => {
  return (
    <SafeAreaView>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Nuevo Avance</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={() => {console.log("Guardando avance")}}
          className="bg-blue-500 px-4 py-2 rounded-full"
          style={{
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}
        >
          <Text className="text-white font-medium">Guardar</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView className="px-4">
        {/* Título */}
        <RequiredTextInput
          label="Título"
          value={"title"}
          onChangeText={() => {return console.log("Change text")}}
          required
          submitAttempted={undefined}
          placeholder="Ej: Instalar cableado"
        />
      </ScrollView>

    </SafeAreaView>
  )
}

export default NewUpdate