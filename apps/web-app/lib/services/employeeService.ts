// apps/web-app/lib/services/employeeService.ts

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

class EmployeeService {
  // Obtener todos los empleados de un usuario
  async getUserEmployees(userId: string): Promise<Employee[]> {
    try {
      const response = await fetch(`/api/employees/user/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Error fetching user employees:", error);
      throw error;
    }
  }

  // Crear un nuevo empleado
  async createEmployee(employeeData: CreateEmployeeParams): Promise<Employee> {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(employeeData),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    } catch (error) {
      console.error("Error creating employee:", error);
      throw error;
    }
  }

  // Eliminar un empleado
  async deleteEmployee(employeeId: string): Promise<void> {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      throw error;
    }
  }
}

export const employeeService = new EmployeeService();
