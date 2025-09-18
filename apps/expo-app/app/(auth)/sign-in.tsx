import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext"; 


import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "@/constants";
import { Feather } from "@expo/vector-icons";

const SignIn = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "" });

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: "", password: "" };

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
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
     
      if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Error en el login");
      }

      const data = await response.json();

      
      if (data.user && data.token) {
        await login(data.user, data.token);
        router.replace("/(tabs)");
      } else {
        throw new Error("Datos de usuario incompletos");
      }


    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo conectar con el servidor. Intenta nuevamente.");
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
        onPress={() => router.push("/")}
      >
        <Feather name="arrow-left" size={24} color="#3B82F6" />
      </TouchableOpacity>

      <View className="flex-1 px-6 pt-20">
        <View className="items-center mb-10">
          <Image
            source={images.signIn}
            className="w-32 h-32 mb-5"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-gray-800">
            Iniciar Sesión
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Ingresa tus credenciales para acceder a Cimenta
          </Text>
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

        <View className="mb-6">
          <Text className="text-gray-700 mb-2 ml-1">Contraseña</Text>
          <View className="relative">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Tu contraseña"
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

        <TouchableOpacity
          className="items-end mb-6"
          onPress={() =>
            Alert.alert("Información", "Funcionalidad por implementar")
          }
        >
          <Text className="text-blue-600">¿Olvidaste tu contraseña?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`py-4 rounded-xl items-center justify-center ${isLoading ? "bg-blue-400" : "bg-blue-600"}`}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-semibold text-lg">
              Iniciar Sesión
            </Text>
          )}
        </TouchableOpacity>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-600">¿No tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.push("/sign-up")}>
            <Text className="text-blue-600 font-semibold">Regístrate</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default SignIn;
