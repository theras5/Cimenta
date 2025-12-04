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
import { useWorkers } from '../../hooks/useWorkers';
import { getInitials, getFullName } from '../../utils/nameHelpers';

const Empleados = () => {
  const { user, loading: authLoading } = useAuth();

  // Usar el hook useWorkers
  const {
    workers,
    isLoading,
    error: workersError,
    createWorker,
    deleteWorker,
    clearError,
  } = useWorkers(user?.id);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    cellNumber: '',
    profession: '',
  });
  const [errors, setErrors] = useState({
    fullName: '',
    cellNumber: '',
    profession: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/sign-in');
    }
  }, [user, authLoading]);

  // Mostrar errores del hook
  useEffect(() => {
    if (workersError) {
      Alert.alert('Error', workersError);
      clearError();
    }
  }, [workersError, clearError]);

  const validateForm = () => {
    const newErrors = {
      fullName: '',
      cellNumber: '',
      profession: '',
    };

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'El nombre completo es obligatorio';
    }

    if (!formData.cellNumber.trim()) {
      newErrors.cellNumber = 'El número de celular es obligatorio';
    } else if (!/^\+?[\d\s-]{8,}$/.test(formData.cellNumber)) {
      newErrors.cellNumber = 'El número de celular no es válido';
    }

    if (!formData.profession.trim()) {
      newErrors.profession = 'La profesión es obligatoria';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== '');
  };

  const handleAddWorker = async () => {
    if (!validateForm() || !user?.id) return;

    try {
      const [firstName, ...lastNameParts] = formData.fullName.trim().split(' ');
      const lastName = lastNameParts.join(' ');

      await createWorker({
        worker_name: firstName,
        worker_surname: lastName || '',
        worker_cellnumber: formData.cellNumber,
        profession: formData.profession,
        employer_id: user.id,
      });

      Alert.alert('Éxito', 'Trabajador agregado correctamente');

      setFormData({ fullName: '', cellNumber: '', profession: '' });
      setErrors({ fullName: '', cellNumber: '', profession: '' });
      setIsDialogOpen(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo agregar el trabajador');
    }
  };

  const handleDeleteWorker = async (id: string, name: string) => {
    Alert.alert(
      'Eliminar Trabajador',
      `¿Estás seguro de que quieres eliminar a ${name}?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorker(id);
              Alert.alert('Éxito', 'Trabajador eliminado correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el trabajador');
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
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
          <Text style={styles.headerTitle}>Mis Trabajadores</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsDialogOpen(true)}
          >
            <Ionicons name="add" size={24} color="#2563EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>Gestión de trabajadores y colaboradores</Text>

          {/* Workers List */}
          {isLoading && workers.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : workers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No tienes trabajadores registrados</Text>
              <Text style={styles.emptySubtext}>
                Agrega tu primer trabajador para comenzar
              </Text>
            </View>
          ) : (
            <View style={styles.workersContainer}>
              {workers.map((worker) => (
                <View key={worker.worker_id} style={styles.workerCard}>
                  <View style={styles.workerIconContainer}>
                    <Text style={styles.workerInitial}>
                      {getInitials(worker.worker_name, worker.worker_surname)}
                    </Text>
                  </View>
                  <View style={styles.workerInfo}>
                    <Text style={styles.workerName}>
                      {getFullName(worker.worker_name, worker.worker_surname)}
                    </Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
                      <Text style={styles.workerProfession}>{worker.profession}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call-outline" size={14} color="#6B7280" />
                      <Text style={styles.workerPhone}>{worker.worker_cellnumber}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() =>
                      handleDeleteWorker(
                        worker.worker_id,
                        getFullName(worker.worker_name, worker.worker_surname)
                      )
                    }
                  >
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Worker Modal */}
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
              <Text style={styles.modalTitle}>Agregar Nuevo Trabajador</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsDialogOpen(false);
                  setFormData({ fullName: '', cellNumber: '', profession: '' });
                  setErrors({ fullName: '', cellNumber: '', profession: '' });
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Nombre Completo <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.fullName && styles.inputError,
                  ]}
                  placeholder="Ej: Juan Pérez"
                  value={formData.fullName}
                  onChangeText={(text) => {
                    setFormData({ ...formData, fullName: text });
                    setErrors({ ...errors, fullName: '' });
                  }}
                />
                {errors.fullName ? (
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Profesión <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.profession && styles.inputError,
                  ]}
                  placeholder="Ej: Electricista, Plomero, Albañil"
                  value={formData.profession}
                  onChangeText={(text) => {
                    setFormData({ ...formData, profession: text });
                    setErrors({ ...errors, profession: '' });
                  }}
                />
                {errors.profession ? (
                  <Text style={styles.errorText}>{errors.profession}</Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Número de Celular <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.cellNumber && styles.inputError,
                  ]}
                  placeholder="+54 9 11 1234-5678"
                  value={formData.cellNumber}
                  onChangeText={(text) => {
                    setFormData({ ...formData, cellNumber: text });
                    setErrors({ ...errors, cellNumber: '' });
                  }}
                  keyboardType="phone-pad"
                />
                {errors.cellNumber ? (
                  <Text style={styles.errorText}>{errors.cellNumber}</Text>
                ) : null}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setIsDialogOpen(false);
                  setFormData({ fullName: '', cellNumber: '', profession: '' });
                  setErrors({ fullName: '', cellNumber: '', profession: '' });
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleAddWorker}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    paddingVertical: 60,
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
  workersContainer: {
    gap: 12,
  },
  workerCard: {
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
  workerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  workerInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2563EB',
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  workerProfession: {
    fontSize: 14,
    color: '#6B7280',
  },
  workerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
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
    maxHeight: '85%',
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
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default Empleados;