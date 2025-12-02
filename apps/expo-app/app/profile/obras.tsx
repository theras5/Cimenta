import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { SiteService, type Site } from '../../services/siteService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Obras = () => {
  const { user, loading: authLoading } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSiteOptionsModalOpen, setIsSiteOptionsModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedSiteForInvite, setSelectedSiteForInvite] = useState<Site | null>(null);
  const [selectedSiteForOptions, setSelectedSiteForOptions] = useState<Site | null>(null);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'client' as 'admin' | 'client',
  });
  const [formData, setFormData] = useState({
    address: '',
    description: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/sign-in');
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.id) {
      loadSites();
    }
  }, [user?.id]);

  const loadSites = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await SiteService.getSitesForUser(user.id);
      setSites(data);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar las obras');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!formData.address.trim()) {
      Alert.alert('Error', 'La dirección es obligatoria');
      return false;
    }
    return true;
  };

  const handleAddSite = async () => {
    if (!validateForm() || !user?.id) return;

    setLoading(true);
    try {
      const newSite = await SiteService.createSite({
        address: formData.address,
        role: 'admin',
        user_id: user.id,
      });

      // Limpiar el formulario y cerrar el modal
      setFormData({ address: '', description: '' });
      setIsDialogOpen(false);

      // Recargar la lista de obras
      await loadSites();

      // Guardar el sitio nuevo como seleccionado
      await AsyncStorage.setItem('selectedSiteId', newSite.id);

      Alert.alert(
        '¡Obra creada!',
        '¿Deseas ir al dashboard con esta obra seleccionada?',
        [
          {
            text: 'Más tarde',
            style: 'cancel',
          },
          {
            text: 'Ir al Dashboard',
            onPress: () => router.push('/(tabs)'),
          },
          {
            text: 'Invitar a otro usuario',
            onPress: () => {
              setSelectedSiteForInvite(newSite);
              setIsInviteModalOpen(true);
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo crear la obra');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSite = async (site: Site) => {
    // Guardar el sitio seleccionado
    await AsyncStorage.setItem('selectedSiteId', site.id);
    await AsyncStorage.setItem('selectedSiteAddress', site.address);

    // Abrir modal de opciones
    setSelectedSiteForOptions(site);
    setIsSiteOptionsModalOpen(true);
  };

  const validateInviteForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!inviteFormData.email.trim()) {
      Alert.alert('Error', 'El email es obligatorio');
      return false;
    }
    if (!emailRegex.test(inviteFormData.email)) {
      Alert.alert('Error', 'El email no es válido');
      return false;
    }
    return true;
  };

  const handleSendInvitation = async () => {
    if (!validateInviteForm() || !selectedSiteForInvite) return;

    setLoading(true);
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
      
      const response = await fetch(`${API_URL}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteFormData.email.toLowerCase().trim(),
          site_id: selectedSiteForInvite.id,
          role: inviteFormData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar la invitación');
      }

      // Mostrar modal de éxito personalizado
      setSuccessMessage(`Se ha enviado una invitación a ${inviteFormData.email}`);
      setShowSuccessModal(true);

      // Limpiar y cerrar
      setInviteFormData({ email: '', role: 'client' });
      setIsInviteModalOpen(false);
      setSelectedSiteForInvite(null);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'No se pudo enviar la invitación');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mis Obras</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsDialogOpen(true)}
          >
            <Ionicons name="add" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Proyectos y construcciones activas</Text>

          {/* Sites List */}
          {sites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="construct-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No tienes obras registradas</Text>
              <Text style={styles.emptySubtext}>
                Agrega tu primera obra para comenzar
              </Text>
            </View>
          ) : (
            <View style={styles.sitesContainer}>
              {sites.map((site) => (
                <TouchableOpacity
                  key={site.id}
                  style={styles.siteCard}
                  onPress={() => handleSelectSite(site)}
                >
                  <View style={styles.siteIconContainer}>
                    <Ionicons name="business" size={24} color="#2563EB" />
                  </View>
                  <View style={styles.siteInfo}>
                    <Text style={styles.siteAddress}>{site.address}</Text>
                    {site.created_at && (
                      <Text style={styles.siteDate}>
                        Creada: {new Date(site.created_at).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Site Modal */}
      <Modal
        visible={isDialogOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDialogOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar Nueva Obra</Text>
              <TouchableOpacity onPress={() => setIsDialogOpen(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Dirección <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Av. Corrientes 1234"
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Descripción de la obra (opcional)"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsDialogOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddSite}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        visible={isInviteModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setIsInviteModalOpen(false);
          setSelectedSiteForInvite(null);
          setInviteFormData({ email: '', role: 'client' });
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invitar Usuario a la Obra</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsInviteModalOpen(false);
                  setSelectedSiteForInvite(null);
                  setInviteFormData({ email: '', role: 'client' });
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedSiteForInvite && (
              <View style={styles.inviteSiteInfo}>
                <Ionicons name="business" size={16} color="#6B7280" />
                <Text style={styles.inviteSiteText}>{selectedSiteForInvite.address}</Text>
              </View>
            )}

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Email del usuario <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="usuario@ejemplo.com"
                  value={inviteFormData.email}
                  onChangeText={(text) =>
                    setInviteFormData({ ...inviteFormData, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Rol en la obra <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      inviteFormData.role === 'client' && styles.roleButtonActive,
                    ]}
                    onPress={() => setInviteFormData({ ...inviteFormData, role: 'client' })}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        inviteFormData.role === 'client' && styles.roleButtonTextActive,
                      ]}
                    >
                      Cliente
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      inviteFormData.role === 'admin' && styles.roleButtonActive,
                    ]}
                    onPress={() => setInviteFormData({ ...inviteFormData, role: 'admin' })}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        inviteFormData.role === 'admin' && styles.roleButtonTextActive,
                      ]}
                    >
                      Administrador
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.roleDescription}>
                  {inviteFormData.role === 'admin'
                    ? 'Podrá crear y gestionar tareas'
                    : 'Podrá ver el progreso y crear solicitudes de cambio'}
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsInviteModalOpen(false);
                  setSelectedSiteForInvite(null);
                  setInviteFormData({ email: '', role: 'client' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSendInvitation}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="mail-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.submitButtonText}>Enviar Invitación</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de opciones de obra */}
      <Modal
        visible={isSiteOptionsModalOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSiteOptionsModalOpen(false)}
      >
        <TouchableOpacity 
          style={styles.optionsModalContainer}
          activeOpacity={1}
          onPress={() => setIsSiteOptionsModalOpen(false)}
        >
          <View style={styles.optionsModalContent}>
            <Text style={styles.optionsModalTitle}>Obra seleccionada</Text>
            {selectedSiteForOptions && (
              <Text style={styles.optionsModalSubtitle}>{selectedSiteForOptions.address}</Text>
            )}

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setIsSiteOptionsModalOpen(false);
                router.push('/(tabs)');
              }}
            >
              <Ionicons name="home-outline" size={24} color="#2563EB" />
              <Text style={styles.optionButtonText}>Ir al Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setIsSiteOptionsModalOpen(false);
                router.push('/site-summary');
              }}
            >
              <Ionicons name="stats-chart-outline" size={24} color="#2563EB" />
              <Text style={styles.optionButtonText}>Ver Resumen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => {
                setIsSiteOptionsModalOpen(false);
                setSelectedSiteForInvite(selectedSiteForOptions);
                setIsInviteModalOpen(true);
              }}
            >
              <Ionicons name="person-add-outline" size={24} color="#2563EB" />
              <Text style={styles.optionButtonText}>Invitar a otro usuario</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionButton, styles.optionButtonCancel]}
              onPress={() => setIsSiteOptionsModalOpen(false)}
            >
              <Text style={styles.optionButtonCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal de éxito */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successModalTitle}>¡Invitación enviada!</Text>
            <Text style={styles.successModalMessage}>{successMessage}</Text>
            <TouchableOpacity 
              style={styles.successModalButton}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.successModalButtonText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  sitesContainer: {
    gap: 12,
  },
  siteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  siteIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  siteInfo: {
    flex: 1,
  },
  siteAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  siteDate: {
    fontSize: 12,
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
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#DC2626',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inviteSiteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    marginTop: 12,
  },
  inviteSiteText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  roleDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  optionsModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  optionsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  optionsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  optionsModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  optionButtonText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
    fontWeight: '500',
  },
  optionButtonCancel: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
    justifyContent: 'center',
  },
  optionButtonCancelText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  successModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  successModalButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
  },
  successModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default Obras;
