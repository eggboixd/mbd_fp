'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

// Define a type for the student profile for clarity
type StudentProfile = Database['public']['Tables']['Student']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: StudentProfile | null; // Changed from studentId to the full profile
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null); // State for the full profile
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setIsLoading(true);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Fetch the entire student profile, not just the ID
        const { data: studentProfile } = await supabase
          .from('Student')
          .select('*') // <-- Select all columns
          .eq('auth_user_id', currentUser.id)
          .single();
        setProfile(studentProfile);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      const newAuthUser = newSession?.user ?? null;
      setUser(newAuthUser);

      if (newAuthUser) {
        // Also fetch profile on auth state change
        const { data: studentProfile } = await supabase
          .from('Student')
          .select('*') // <-- Select all columns
          .eq('auth_user_id', newAuthUser.id)
          .single();
        setProfile(studentProfile);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};