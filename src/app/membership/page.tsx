'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider'; // Adjust path
import { Database } from '@/types/supabase';
import { useRouter } from 'next/navigation';

type Membership = Database['public']['Tables']['Membership']['Row'];

export default function MembershipPage() {
  const { user, studentId, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !studentId) {
      router.push('/login?redirect=/membership');
      return;
    }

    const fetchMembership = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('Membership')
        .select('*')
        .eq('Student_stdn_id', studentId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
        console.error('Error fetching membership:', fetchError);
        setError(fetchError.message);
      } else {
        setMembership(data);
      }
      setLoading(false);
    };

    fetchMembership();

    // Realtime for membership updates
    const channel = supabase
        .channel(`membership-${studentId}`)
        .on<Membership>(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'Membership',
                filter: `Student_stdn_id=eq.${studentId}` // Only listen to changes for this student's membership
            },
            (payload) => {
                console.log('Membership change received:', payload);
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    setMembership(payload.new as Membership);
                } else if (payload.eventType === 'DELETE') {
                    setMembership(null);
                }
            }
        )
        .subscribe(err => { if(err) console.error("Membership subscription error", err)});

    return () => {
        supabase.removeChannel(channel);
    };

  }, [user, studentId, authLoading, router]);

  const handleCreateMembership = async () => {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    setMessage(null);

    // Generate a unique membership ID
    const mmbr_id = `MMBR${Date.now()}${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
    const creationDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]; // 1 year expiry

    const { data, error: insertError } = await supabase
      .from('Membership')
      .insert({
        mmbr_id: mmbr_id,
        mmbr_points: 0, // Initial points
        mmbr_creationdate: creationDate,
        mmbr_expirydate: expiryDate,
        Student_stdn_id: studentId,
      })
      .select()
      .single();

    if (insertError) {
      setError(`Failed to create membership: ${insertError.message}`);
    } else if (data) {
      setMembership(data);
      setMessage('Membership created successfully!');
    }
    setLoading(false);
  };

  if (authLoading || loading) return <p className="text-center mt-10">Loading membership details...</p>;
  if (error) return <p className="text-red-500 bg-red-100 p-3 rounded text-center mt-10">{error}</p>;

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center">Your Membership</h1>
      {message && <p className="text-green-500 bg-green-100 p-3 rounded mb-4">{message}</p>}
      {membership ? (
        <div className="space-y-3">
          <p><strong>Membership ID:</strong> {membership.mmbr_id}</p>
          <p><strong>Points:</strong> {membership.mmbr_points}</p>
          <p><strong>Member Since:</strong> {new Date(membership.mmbr_creationdate).toLocaleDateString()}</p>
          <p><strong>Expires On:</strong> {new Date(membership.mmbr_expirydate).toLocaleDateString()}</p>
        </div>
      ) : (
        <div>
          <p className="mb-4 text-center">You are not a member yet.</p>
          <button
            onClick={handleCreateMembership}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
            {loading ? 'Creating...' : 'Become a Member Now!'}
          </button>
        </div>
      )}
    </div>
  );
}