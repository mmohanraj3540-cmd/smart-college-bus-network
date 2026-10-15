import { create } from 'zustand';

interface User {
  id: number;
  role: string;
  college_id: number;
  name?: string;
  selected_stop_id?: number;
  regular_bus_id?: number;
  assigned_bus?: string;
  assigned_stop?: any;
  assigned_route?: string;
  stops?: any[];
  email?: string;
}

interface AppState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
