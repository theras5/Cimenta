import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants";
import { Feather } from "@expo/vector-icons";

const SignUp = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    };

    if (!name.trim()) {
      newErrors.name = "El nombre es requerido";
      isValid = false;
    }

    if (!email.trim()) {
      newErrors.email = "El email es requerido";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email inválido";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "La contraseña es requerida";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
      isValid = false;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const result = await response.json();

      if (!response.ok) {
        Alert.alert("Error", result.error || "No se pudo completar el registro.");
        return;
      }

      Alert.alert(
        "Registro exitoso",
        "Tu cuenta ha sido creada correctamente",
        [
          {
            text: "OK",
            onPress: () => router.replace("/sign-in"),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "No se pudo conectar con el servidor. Vuelva a intentar en otro momento."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Botón de regreso */}
      <TouchableOpacity 
        className="absolute mt-20 left-4 z-10 p-2"
        onPress={() => router.push('/')}
      >
        <Feather name="arrow-left" size={24} color="#3B82F6" />
      </TouchableOpacity>
      
      <ScrollView className="flex-1 px-6 pt-20">
        <View className="items-center mb-8">
          <Image
            source={images.signUp}
            className="w-28 h-28 mb-4"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-gray-800">Crear Cuenta</Text>
          <Text className="text-gray-500 text-center mt-2">
            Regístrate para comenzar a usar Cimenta
          </Text>
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 ml-1">Nombre completo</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ingresa tu nombre"
            className={`bg-gray-100 p-4 rounded-xl ${errors.name ? "border border-red-500" : ""}`}
          />
          {errors.name ? (
            <Text className="text-red-500 ml-1 mt-1">{errors.name}</Text>
          ) : null}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 ml-1">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tucorreo@ejemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className={`bg-gray-100 p-4 rounded-xl ${errors.email ? "border border-red-500" : ""}`}
          />
          {errors.email ? (
            <Text className="text-red-500 ml-1 mt-1">{errors.email}</Text>
          ) : null}
        </View>

        <View className="mb-4">
          <Text className="text-gray-700 mb-2 ml-1">Contraseña</Text>
          <View className="relative">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              secureTextEntry={!showPassword}
              className={`bg-gray-100 p-4 rounded-xl ${errors.password ? "border border-red-500" : ""}`}
            />
            <TouchableOpacity
              className="absolute right-4 top-4"
              onPress={togglePasswordVisibility}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="gray"
              />
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text className="text-red-500 ml-1 mt-1">{errors.password}</Text>
          ) : null}
        </View>

        <View className="mb-6">
          <Text className="text-gray-700 mb-2 ml-1">Confirmar contraseña</Text>
          <View className="relative">
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repite tu contraseña"
              secureTextEntry={!showPassword}
              className={`bg-gray-100 p-4 rounded-xl ${errors.confirmPassword ? "border border-red-500" : ""}`}
            />
            <TouchableOpacity
              className="absolute right-4 top-4"
              onPress={togglePasswordVisibility}
            >
              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="gray"
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword ? (
            <Text className="text-red-500 ml-1 mt-1">
              {errors.confirmPassword}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          className={`py-4 rounded-xl items-center justify-center mb-4 ${isLoading ? "bg-blue-400" : "bg-blue-600"}`}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">
              Registrarse
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mb-8">
          <Text className="text-gray-600">¿Ya tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.push("/sign-in")}>
            <Text className="text-blue-600 font-semibold">Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};


export default SignUp;
