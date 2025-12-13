import React, { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SiteService } from "../services/siteService"; // Asegúrate de importar tu servicio
import { UserService } from "../services/userService";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Modal, TextInput, Dimensions } from "react-native";
import { router } from "expo-router";
import { Picker } from "@react-native-picker/picker"; // Instala si no lo tienes
import { useAuth } from "../context/AuthContext";
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';



const { width } = Dimensions.get("window");
const BUTTON_WIDTH = Math.min(width * 0.85, 320);

export default function SelectSiteScreen() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingPremium, setCheckingPremium] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newRole, setNewRole] = useState("client"); // Estado para el rol
  const { user } = useAuth(); // user.id es el uuid del usuario

// Verificar autenticación y premium status al cargar
useFocusEffect(
  useCallback(() => {
    const checkAuthAndPremium = async () => {
      // Si no hay usuario, redirigir al login
      if (!user?.id) {
        router.replace('/(auth)/sign-in');
        return;
      }

      try {
        const isPremium = await UserService.checkPremiumStatus(user.id);
        if (!isPremium) {
          router.replace('/paywall');
          return;
        }
      } catch (error) {
        console.error('Error verificando premium:', error);
      } finally {
        setCheckingPremium(false);
      }
    };

    checkAuthAndPremium();
  }, [user])
);

useFocusEffect(
  useCallback(() => {
    const loadSites = async () => {
      
      // Esperar un poco por el user si no está disponible
      let currentUser = user;
      if (!currentUser?.id) {
        // Esperar hasta 2 segundos por el user
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (user?.id) {
            currentUser = user;
            break;
          }
        }
      }

      if (currentUser?.id) {
        setLoading(true);
        try {
          const data = await SiteService.getSitesForUser(currentUser.id);
          setSites(data);
        } catch (error) {
          Alert.alert("Error", "No se pudieron cargar las obras");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadSites();
  }, [user])
);

    const handleSelect = async (site: any) => {
    await AsyncStorage.setItem("selectedSiteId", site.id); // Guarda el id del site
    router.replace("/(tabs)");
    };

      // Abre el modal
    const handleAddSite = () => {
      setModalVisible(true);
    };


  // Crea la obra
  const handleCreateSite = async () => {
    if (!newAddress.trim()) {
      Alert.alert("Error", "La dirección no puede estar vacía");
      return;
    }
    try {
      if (!user || !user.id) {
        Alert.alert("Error", "No hay usuario logueado");
        return;
      }
      const newSite = await SiteService.createSite({
        address: newAddress.trim(),
        role: newRole,
        user_id: user.id, 
      });      setSites((prev) => [...prev, newSite]);
      setModalVisible(false);
      setNewAddress("");
      Alert.alert("Obra creada", "La obra fue creada correctamente");
    } catch (err) {
      Alert.alert("Error", "No se pudo crear la obra");
    }
  };

  if (loading || checkingPremium) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
       <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.3)"
        }}>
          <View style={{
            backgroundColor: "#fff",
            padding: 24,
            borderRadius: 12,
            width: "85%",
            alignItems: "center"
          }}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 16 }}>Nueva obra</Text>
            <TextInput
              placeholder="Dirección de la obra"
              value={newAddress}
              onChangeText={setNewAddress}
              style={{
                borderWidth: 1,
                borderColor: "#ccc",
                borderRadius: 8,
                padding: 10,
                width: "100%",
                marginBottom: 20,
                fontSize: 16,
              }}
              autoFocus
            />
            <Text style={{ fontSize: 16, marginBottom: 8, alignSelf: "flex-start" }}>Tipo de usuario</Text>
            <View style={{
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginBottom: 20,
              width: "100%",
              overflow: "hidden"
            }}>
              <Picker
                selectedValue={newRole}
                onValueChange={setNewRole}
                style={{ width: "100%" }}
              >
                <Picker.Item label="Cliente" value="client" />
                <Picker.Item label="Administrador" value="admin" />
              </Picker>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  backgroundColor: "#eee",
                  marginRight: 10,
                }}
              >
                <Text style={{ color: "#333", fontWeight: "bold" }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateSite}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  backgroundColor: "#2B44FF",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Crear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      <ScrollView
        contentContainerStyle={{
          alignItems: "center",
          paddingTop: 60,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 32,
          color: "#222",
        }}>
          Mis Obras
        </Text>
        {sites.map((obra) => (
          <TouchableOpacity
            key={obra.id}
            style={{
              backgroundColor: "#2B44FF",
              borderRadius: 10,
              paddingVertical: 16,
              marginBottom: 18,
              width: BUTTON_WIDTH,
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={() => handleSelect(obra)}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 17,
                fontWeight: "bold",
                letterSpacing: 0.2,
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {obra.address}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={{
            borderColor: "#2B44FF",
            borderWidth: 2,
            borderRadius: 10,
            paddingVertical: 16,
            marginBottom: 18,
            width: BUTTON_WIDTH,
            alignItems: "center",
            backgroundColor: "#fff",
          }}
          onPress={handleAddSite}
        >
          <Text style={{
            color: "#2B44FF",
            fontSize: 17,
            fontWeight: "bold",
            letterSpacing: 0.2,
          }}>
            Añadir obra
          </Text>
        </TouchableOpacity>
        {/* Espacio para empujar el último botón hacia abajo */}
        <View style={{ flex: 1, minHeight: 60 }} />
      </ScrollView>
      <View style={{
        alignItems: "center",
        marginBottom: 32,
      }}>
        
      </View>
    </View>
  );
}