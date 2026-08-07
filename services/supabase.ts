import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://czocbnyoenjbpxmcqobn.supabase.co";

// La clave pública sale de la variable de entorno, no del código.
//
// Estaba escrita acá como literal, así que cuando se rotaron las claves de
// Supabase cambiar la variable en Vercel no hacía absolutamente nada: el bundle
// seguía llevando la vieja y el login devolvía 401 para todo el mundo. Una clave
// hardcodeada es una clave que no se puede rotar.
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
if (!SUPABASE_ANON_KEY) throw new Error('Falta VITE_SUPABASE_ANON_KEY');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'car-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
});

// Custom helper to call the secure backend API
export async function callAdminUsersApi(action: string, payload?: any) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No active session found. Please log in.');

  const res = await fetch('/api/admin-users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ action, payload })
  });

  const responseData = await res.json();
  if (!res.ok) {
    throw new Error(responseData.error || 'API request failed');
  }
  return { data: responseData, error: null };
}

// Mock supabaseAdmin to preserve existing code references but execute securely on the server
export const supabaseAdmin = {
  auth: {
    admin: {
      listUsers: async (params?: any) => {
        try {
          const res = await callAdminUsersApi('listUsers', params);
          return res;
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      getUserById: async (userId: string) => {
        try {
          const res = await callAdminUsersApi('getUserById', { userId });
          return res;
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      createUser: async (params: any) => {
        try {
          const res = await callAdminUsersApi('createUser', params);
          // Return format expected: { data: { user: ... }, error: null }
          return { data: { user: res.data.user }, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      updateUserById: async (userId: string, data: any) => {
        try {
          const res = await callAdminUsersApi('updateUserById', { userId, data });
          return res;
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      deleteUser: async (userId: string) => {
        try {
          const res = await callAdminUsersApi('deleteUser', { userId });
          return res;
        } catch (err: any) {
          return { data: null, error: err };
        }
      }
    }
  }
} as any;
