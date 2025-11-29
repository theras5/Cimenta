import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setLoading(true);
        
        // Obtener user_id y site_id de AsyncStorage
        const userString = await AsyncStorage.getItem('user');
        const siteId = await AsyncStorage.getItem('selectedSiteId');
        
        if (!userString || !siteId) {
          setRole(null);
          setLoading(false);
          return;
        }
        
        const user = JSON.parse(userString);
        const userId = user.id;
        
        // Llamar al backend para obtener el rol
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/user-role?user_id=${userId}&site_id=${siteId}`
        );
        
        if (!response.ok) {
          console.error('Error al obtener rol del usuario');
          setRole(null);
          setLoading(false);
          return;
        }
        
        const data = await response.json();
        setRole(data.role);
        setLoading(false);
      } catch (error) {
        console.error('Error en useUserRole:', error);
        setRole(null);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return { role, loading };
}
