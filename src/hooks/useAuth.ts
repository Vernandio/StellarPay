import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { subscribeToAuth } from "../services/firebase/auth";
import { getUserProfile } from "../services/firebase/firestore";

export const useAuth = () => {
  const { user, profile, isLoading, setUser, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userProfile = await getUserProfile(firebaseUser.uid);
        setProfile(userProfile);
      } else {
        reset();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    profile,
    isLoading,
    isAuthenticated: !!user,
    hasProfile: !!profile,
    hasPin: !!profile?.hasPin,
  };
};
