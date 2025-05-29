'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  studentId: string | null; // Your custom stdn_id
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      setIsLoading(true);
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error fetching session:", sessionError.message);
        setIsLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Fetch corresponding student profile
        const { data: studentProfile, error: profileError } = await supabase
          .from('Student')
          .select('stdn_id')
          .eq('auth_user_id', currentSession.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116: no rows found
            console.error("Error fetching student profile:", profileError.message);
        }
        setStudentId(studentProfile?.stdn_id ?? null);
      } else {
        setStudentId(null);
      }
      setIsLoading(false);
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
         const { data: studentProfile, error: profileError } = await supabase
          .from('Student')
          .select('stdn_id')
          .eq('auth_user_id', newSession.user.id)
          .single();
        if (profileError && profileError.code !== 'PGRST116') {
            console.error("Error updating student profile on auth change:", profileError.message);
        }
        setStudentId(studentProfile?.stdn_id ?? null);
      } else {
        setStudentId(null);
      }
      setIsLoading(false); // Ensure loading is false after initial check or change
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setStudentId(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, studentId, isLoading, signOut }}>
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