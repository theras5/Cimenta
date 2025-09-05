import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ========= MOCKDATA ========== */

/* mock data for change types */
interface ChangeCategory {
  name: string;
  color: string;
}

const materiales: ChangeCategory = { name: "MATERIALES", color: "bg-amber-500" };
const diseno: ChangeCategory = { name: "DISEÑO", color: "bg-purple-500" };
const cronograma: ChangeCategory = { name: "CRONOGRAMA", color: "bg-green-500" };
const presupuesto: ChangeCategory = { name: "PRESUPUESTO", color: "bg-red-500" };
const changeTypes: ChangeCategory[] = [materiales, diseno, cronograma, presupuesto];

/* mock data for impact levels */
interface ImpactLevel {
  name: string;
  color: string;
}

const bajo: ImpactLevel = { name: "BAJO", color: "bg-green-500" };
const medio: ImpactLevel = { name: "MEDIO", color: "bg-amber-500" };
const alto: ImpactLevel = { name: "ALTO", color: "bg-orange-500" };
const critico: ImpactLevel = { name: "CRÍTICO", color: "bg-red-500" };
const impactLevels: ImpactLevel[] = [bajo, medio, alto, critico];

export default function NewChange() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changeType, setChangeType] = useState("MATERIALES");
  const [impactLevel, setImpactLevel] = useState("BAJO");
  const [justification, setJustification] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  const handleSave = () => {
    console.log("Guardando solicitud de cambio:", {
      title,
      description,
      changeType,
      impactLevel,
      justification,
      isUrgent,
    });
    // Aquí implementarías la lógica para guardar la solicitud
    router.push("/changes/changes");
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 mb-6">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-gray-800 font-bold text-2xl">Nueva Solicitud</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
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

      <ScrollView className="flex-1 px-4">
        {/* Título */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Título</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Cambio de materiales"
            className="bg-white p-4 rounded-xl border border-gray-200"
          />
        </View>

        {/* Descripción */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Descripción</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe los detalles del cambio..."
            multiline
            numberOfLines={4}
            className="bg-white p-4 rounded-xl border border-gray-200 h-24"
            textAlignVertical="top"
          />
        </View>

        {/* Tipo de cambio */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Tipo de cambio</Text>
          <View className="flex-row flex-wrap gap-2">
            {changeTypes.map((type) => (
              <TouchableOpacity
                key={type.name}
                onPress={() => setChangeType(type.name)}
                className={`px-3 py-2 rounded-full ${
                  changeType === type.name ? type.color : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    changeType === type.name ? "text-white" : "text-gray-800"
                  }`}
                >
                  {type.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Justificación */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Justificación</Text>
          <TextInput
            value={justification}
            onChangeText={setJustification}
            placeholder="¿Por qué es necesario este cambio?"
            multiline
            numberOfLines={4}
            className="bg-white p-4 rounded-xl border border-gray-200 h-24"
            textAlignVertical="top"
          />
        </View>

        {/* Nivel de impacto */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Nivel de impacto</Text>
          <View className="flex-row flex-wrap gap-2">
            {impactLevels.map((level) => (
              <TouchableOpacity
                key={level.name}
                onPress={() => setImpactLevel(level.name)}
                className={`px-3 py-2 rounded-full ${
                  impactLevel === level.name ? level.color : "bg-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    impactLevel === level.name ? "text-white" : "text-gray-800"
                  }`}
                >
                  {level.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ¿Es urgente? */}
        <View className="mb-4 flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200">
          <Text className="text-gray-700 font-medium">¿Es urgente?</Text>
          <Switch
            value={isUrgent}
            onValueChange={setIsUrgent}
            trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
            thumbColor={isUrgent ? "#3b82f6" : "#f4f4f5"}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}