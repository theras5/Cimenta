interface Purchase {
  id: string;
  user_id: string;
  site_id: string;
  product: string;
  description?: string;
  quantity: number;
  price?: number;
  supplier?: string;
  category: string;
  status: 'pending' | 'purchased' | 'delivered';
  purchase_date?: string;
  delivery_date?: string;
  created_at?: string;
}

interface CreatePurchaseDTO {
  product: string;
  description?: string;
  quantity: number;
  price?: number;
  supplier?: string;
  category: string;
  status?: 'pending' | 'purchased' | 'delivered';
  purchase_date?: string;
  delivery_date?: string;
  site_id: string;
  user_id: string;
}

export const getAllPurchases = async (): Promise<Purchase[]> => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/purchases`);
    if (!response.ok) {
      throw new Error('Error al obtener las compras');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getAllPurchases:', error);
    throw error;
  }
};

export const getPurchaseById = async (id: string): Promise<Purchase> => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/purchases/${id}`);
    if (!response.ok) {
      throw new Error('Error al obtener la compra');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getPurchaseById:', error);
    throw error;
  }
};

export const createPurchase = async (purchase: CreatePurchaseDTO): Promise<Purchase> => {
  try {
    const url = `${process.env.EXPO_PUBLIC_API_URL}/purchases`;
    console.log('Enviando POST a:', url);
    console.log('Datos:', JSON.stringify(purchase, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchase),
    });
    
    console.log('Respuesta status:', response.status);
    console.log('Respuesta headers:', response.headers);
    
    if (!response.ok) {
      let errorMessage = 'Error al crear la compra';
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('Error JSON del servidor:', errorData);
        } catch (e) {
          console.error('No se pudo parsear el error JSON');
        }
      } else {
        // Es HTML u otro tipo, leer como texto
        const errorText = await response.text();
        console.error('Error del servidor (HTML):', errorText.substring(0, 500));
        errorMessage = `Error del servidor: ${response.status} - Revisa los logs del servidor`;
      }
      throw new Error(errorMessage);
    }
    
    const result = await response.json();
    console.log('Compra creada exitosamente:', result);
    return result;
  } catch (error) {
    console.error('Error en createPurchase:', error);
    throw error;
  }
};

export const updatePurchase = async (id: string, purchase: Partial<Purchase>): Promise<Purchase> => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/purchases/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(purchase),
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar la compra');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en updatePurchase:', error);
    throw error;
  }
};

export const deletePurchase = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/purchases/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Error al eliminar la compra');
    }
  } catch (error) {
    console.error('Error en deletePurchase:', error);
    throw error;
  }
};

export const getPurchasesBySite = async (siteId: string): Promise<Purchase[]> => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/purchases/site/${siteId}`);
    if (!response.ok) {
      throw new Error('Error al obtener las compras del sitio');
    }
    return await response.json();
  } catch (error) {
    console.error('Error en getPurchasesBySite:', error);
    throw error;
  }
};

export const updatePurchaseStatus = async (id: string, updateData: Partial<Purchase>): Promise<Purchase> => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/purchases/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      throw new Error('Error al actualizar el estado de la compra');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error en updatePurchaseStatus:', error);
    throw error;
  }
};
