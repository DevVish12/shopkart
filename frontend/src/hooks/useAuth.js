import { useAuth } from '../context/AuthContext.jsx';

export default function useAuthHook() {
  return useAuth();
}

export { useAuth } from '../context/AuthContext.jsx';
