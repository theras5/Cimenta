import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { UserService } from '../../services/userService';

interface ProfileMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  route: string;
}

const profileMenuItems: ProfileMenuItem[] = [
  {
    icon: 'person-outline',
    title: 'Mi cuenta',
    description: 'Información personal y configuración',
    route: '/profile/cuenta',
  },
  {
    icon: 'construct-outline',
    title: 'Mis obras',
    description: 'Proyectos y construcciones activas',
    route: '/profile/obras',
  },
  {
    icon: 'people-outline',
    title: 'Mis empleados',
    description: 'Gestión de equipo y colaboradores',
    route: '/profile/empleados',
  },
  {
    icon: 'business-outline',
    title: 'Mis clientes',
    description: 'Cartera de clientes y contactos',
    route: '/profile/clientes',
  },
];

const Profile = () => {
  const { user, loading, logout, token } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);


  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/sign-in');
    }
  }, [user, loading]);

  const loadAvatar = useCallback(async () => {
    if (!user?.id || !token) return;
    try {
      const url = await UserService.getAvatarUrl(user.id, token);
      setAvatarUrl(url);
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  }, [user?.id, token]);

  useEffect(() => {
    if (user?.id) {
      loadAvatar();
    }
  }, [user?.id, loadAvatar]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se necesita permiso para acceder a la galería'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permisos necesarios',
          'Se necesita permiso para usar la cámara'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!user?.id || !token) return;
    try {
      setUploading(true);
      await UserService.uploadAvatar(user.id, uri, token);
      await loadAvatar();
      Alert.alert('Éxito', 'Foto de perfil actualizada');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', error.message || 'No se pudo subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    if (!user?.id || !token) return;
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploading(true);
              await UserService.deleteAvatar(user.id, token);
              setAvatarUrl(null);
              Alert.alert('Éxito', 'Foto de perfil eliminada');
            } catch (error: any) {
              console.error('Error deleting avatar:', error);
              Alert.alert('Error', 'No se pudo eliminar la foto');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const handleAvatarPress = () => {
    setShowAvatarModal(true);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/sign-in');
          },
        },
      ]
    );
  };

  const getInitials = (name: string | undefined) => {
    if (!name || typeof name !== 'string') {
      return 'U';
    }
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Cargando perfil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Redirigiendo...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfoContainer}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleAvatarPress}
            disabled={uploading}
          >
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }} 
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(user.name)}</Text>
              </View>
            )}
            <View style={styles.editAvatarBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFF" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user.name || 'Usuario'}</Text>
          <Text style={styles.userEmail}>{user.email || 'Sin email'}</Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {profileMenuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name={item.icon} size={24} color="#2563EB" />
                </View>
                <View style={styles.menuItemText}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemDescription}>
                    {item.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <View style={styles.logoutContent}>
            <View style={styles.logoutIconContainer}>
              <Ionicons name="log-out-outline" size={24} color="#DC2626" />
            </View>
            <View style={styles.logoutText}>
              <Text style={styles.logoutTitle}>Cerrar sesión</Text>
              <Text style={styles.logoutDescription}>Salir de tu cuenta</Text>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal de opciones de avatar */}
      <Modal
        visible={showAvatarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalContainer}
          activeOpacity={1}
          onPress={() => setShowAvatarModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Foto de perfil</Text>
            <Text style={styles.modalSubtitle}>Selecciona una opción</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowAvatarModal(false);
                takePhoto();
              }}
            >
              <Ionicons name="camera-outline" size={24} color="#2563EB" />
              <Text style={styles.modalOptionText}>Tomar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                setShowAvatarModal(false);
                pickImage();
              }}
            >
              <Ionicons name="image-outline" size={24} color="#2563EB" />
              <Text style={styles.modalOptionText}>Elegir de galería</Text>
            </TouchableOpacity>

            {avatarUrl && (
              <TouchableOpacity
                style={[styles.modalOption, styles.modalOptionDelete]}
                onPress={() => {
                  setShowAvatarModal(false);
                  deleteAvatar();
                }}
              >
                <Ionicons name="trash-outline" size={24} color="#DC2626" />
                <Text style={[styles.modalOptionText, styles.modalOptionDeleteText]}>Eliminar foto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.modalOption, styles.modalOptionCancel]}
              onPress={() => setShowAvatarModal(false)}
            >
              <Text style={styles.modalOptionCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
  },
  profileInfoContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 16,
    position: 'relative',

  },
  avatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  menuItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutButton: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  logoutIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoutText: {
    flex: 1,
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 2,
  },
  logoutDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
    fontWeight: '500',
  },
  modalOptionDelete: {
    backgroundColor: '#FEF2F2',
  },
  modalOptionDeleteText: {
    color: '#DC2626',
  },
  modalOptionCancel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    justifyContent: 'center',
  },
  modalOptionCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Profile;