import { Alert } from 'react-native';

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
  created_at?: string;
}

export interface CreateEmployeeParams {
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
}

const handleApiError = (error: any): never => {
  console.error('API Error:', error);
  Alert.alert(
    'Error de conexión',
    'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
  );
  throw error;
};

export const employeeService = {
  // Obtener todos los empleados de un usuario
  async getUserEmployees(userId: string): Promise<Employee[]> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/employees/user/${userId}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Crear un nuevo empleado
  async createEmployee(employeeData: CreateEmployeeParams): Promise<Employee> {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },

  // Eliminar un empleado
  async deleteEmployee(employeeId: string): Promise<void> {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/employees/${employeeId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      return handleApiError(error);
    }
  },
};
