'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { Database } from '@/types/supabase';
import { useRouter } from 'next/navigation';

// Define types for the data we will fetch
type Student = Database['public']['Tables']['Student']['Row'];
type Membership = Database['public']['Tables']['Membership']['Row'];

export default function ProfilePage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // State for both student profile and membership
  const [student, setStudent] = useState<Student | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user || !profile?.stdn_id) {
      router.push('/login?redirect=/profile');
      return;
    }

    const fetchProfileData = async () => {
      setLoading(true);
      setError(null);

      // Fetch both student details and membership status concurrently
      const [studentResponse, membershipResponse] = await Promise.all([
        supabase.from('Student').select('*').eq('stdn_id', profile.stdn_id).single(),
        supabase.from('Membership').select('*').eq('Student_stdn_id', profile.stdn_id).single()
      ]);

      // Handle student data
      if (studentResponse.error) {
        console.error('Error fetching student profile:', studentResponse.error);
        setError(studentResponse.error.message);
      } else {
        setStudent(studentResponse.data);
      }

      // Handle membership data (it's okay if it's not found)
      if (membershipResponse.error && membershipResponse.error.code !== 'PGRST116') {
        console.error('Error fetching membership:', membershipResponse.error);
        setError(membershipResponse.error.message);
      } else {
        setMembership(membershipResponse.data);
      }

      setLoading(false);
    };

    fetchProfileData();

    // You can keep the realtime subscription for membership here if you like
    const channel = supabase
      .channel(`membership-profile-${profile.stdn_id}`)
      .on<Membership>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Membership', filter: `Student_stdn_id=eq.${profile.stdn_id}` },
        (payload) => {
          console.log('Membership change received on profile page:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setMembership(payload.new as Membership);
          } else if (payload.eventType === 'DELETE') {
            setMembership(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, authLoading, router]);

  const handleCreateMembership = async () => {
    if (!profile?.stdn_id) return;
    setLoading(true);
    setError(null);
    
    const creationDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    const { data, error: insertError } = await supabase
      .from('Membership')
      .insert({
        mmbr_points: 0,
        mmbr_creationdate: creationDate,
        mmbr_expirydate: expiryDate,
        Student_stdn_id: profile.stdn_id,
      })
      .select()
      .single();

    if (insertError) {
      setError(`Failed to create membership: ${insertError.message}`);
    } else {
      setMembership(data);
      setMessage('Membership created successfully!');
    }
    setLoading(false);
  };
  
  if (authLoading || loading) return <p className="text-center mt-10">Loading Profile...</p>;
  if (error) return <p className="text-red-500 bg-red-100 p-3 rounded text-center mt-10">{error}</p>;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4 text-amber-50">My Profile</h1>
      
      {/* --- Student Details Section --- */}
      {student && (
        <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-700 mb-3">Welcome, {student.stdn_name}!</h2>
          <div className="space-y-2 text-gray-600">
            <p><strong>Student ID:</strong> {student.stdn_id}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Telephone:</strong> {student.stdn_telpnum}</p>
          </div>
        </div>
      )}

      {/* --- Membership Section (Conditional) --- */}
      <div className="bg-white shadow-lg rounded-lg p-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Membership Status</h2>
        {message && <p className="text-green-600 bg-green-100 p-3 rounded mb-4 text-center font-medium">{message}</p>}
        
        {membership ? (
          <div className="space-y-4 text-zinc-800">
            <p><strong>Membership ID:</strong> <span className="font-mono">{membership.mmbr_id}</span></p>
            <p><strong>Points:</strong> <span className="font-semibold text-lg text-blue-600">{membership.mmbr_points}</span></p>
            <p><strong>Member Since:</strong> {new Date(membership.mmbr_creationdate).toLocaleDateString()}</p>
            <p><strong>Expires On:</strong> {new Date(membership.mmbr_expirydate).toLocaleDateString()}</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="mb-6 text-gray-600">You are not a member yet. Join to earn points on every rental!</p>
            <button
              onClick={handleCreateMembership}
              disabled={loading}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Become a Member Now!'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}