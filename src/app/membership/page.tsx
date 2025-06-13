'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider'; 
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
    if (authLoading) {
      setLoading(true);
      return;
    }
    if (!user || !studentId) {
      router.push('/login?redirect=/membership');
      return;
    }

    setLoading(true);

    const fetchMembership = async () => {
      setError(null);
      console.log(`Fetching membership for studentId: ${studentId}`);
      const { data, error: fetchError } = await supabase
        .from('Membership')
        .select('*')
        .eq('Student_stdn_id', studentId) 
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: single row not found
        console.error('Error fetching membership (raw):', fetchError);
        console.error('Error fetching membership (stringified):', JSON.stringify(fetchError, null, 2));
        setError(fetchError.message || "Failed to fetch membership details.");
      } else {
        console.log('Fetched membership data:', data);
        setMembership(data);
      }
      setLoading(false);
    };

    fetchMembership();

    const channel = supabase
      .channel(`membership-${studentId}`)
      .on<Membership>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Membership',
          filter: `Student_stdn_id=eq.${studentId}`
        },
        (payload) => {
          console.log(`Membership change received for ${studentId}:`, payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setMembership(payload.new as Membership);
          } else if (payload.eventType === 'DELETE') {
            setMembership(null);
          }
        }
      )
      .subscribe((status, subscriptionError) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to membership updates for student ${studentId}!`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Membership subscription status for ${studentId}: ${status}`);
          if (subscriptionError) {
            console.error(`Membership subscription error details for ${studentId}:`, subscriptionError);
            if (!error) {
              setError("Realtime connection issue for membership: " + (subscriptionError?.message || status));
            }
          }
        } else if (status === 'CLOSED') {
          console.log(`Membership subscription channel for ${studentId} was CLOSED.`);
        } else {
          console.log(`Membership subscription for ${studentId}: unhandled status - ${status}`);
        }
      });

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
          .then(() => console.log(`Unsubscribed from membership ${studentId}.`))
          .catch(err => console.error(`Error unsubscribing from membership ${studentId}:`, err));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, studentId, authLoading, router]);

  const handleCreateMembership = async () => {
    if (!studentId) {
      setError("Cannot create membership: Student ID is missing. Please log in again.");
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    // Generate mmbr_id on the client side since it is required by the type
    const mmbr_id = crypto.randomUUID();

    const creationDate = new Date().toISOString().split('T')[0];
    const expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    const { data, error: insertError } = await supabase
      .from('Membership')
      .insert({
        mmbr_id,
        mmbr_points: 0,
        mmbr_creationdate: creationDate,
        mmbr_expirydate: expiryDate,
        Student_stdn_id: studentId, // Ensure this matches exact DB column name casing if quoted (e.g., "Student_stdn_id")
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating membership (raw object):", insertError);
      try {
        console.error("Error creating membership (JSON.stringify):", JSON.stringify(insertError, null, 2));
      } catch (e) {
        console.error('Could not stringify insertError:', e);
      }
      console.error("Error message:", insertError.message);
      if (typeof insertError === 'object' && insertError !== null) {
        const supabaseError = insertError as { code?: string; details?: string; hint?: string; message: string };
        console.error("Error code:", supabaseError.code);
        console.error("Error details:", supabaseError.details);
        console.error("Error hint:", supabaseError.hint);
      }
      setError(`Failed to create membership: ${insertError.message || 'An unknown error occurred.'}`);
    } else if (data) {
      setMembership(data);
      setMessage('Membership created successfully!');
    }
    setLoading(false);
  };

  if (authLoading || (loading && !error)) {
      return <p className="text-center mt-10 text-gray-700">Loading membership details...</p>;
  }

  if (error) {
      return (
          <div className="max-w-md mx-auto mt-10 p-6 text-center">
              <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>
              <button 
                onClick={() => { 
                  setError(null); 
                }} 
                className="text-blue-600 hover:underline"
              >
                Try again
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow-xl bg-white">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Your Membership</h1>
      {message && <p className="text-green-600 bg-green-100 p-3 rounded mb-4 text-center font-medium">{message}</p>}

      {membership ? (
        <div className="space-y-4 text-gray-700">
          <p><strong>Membership ID:</strong> <span className="font-mono">{membership.mmbr_id}</span></p>
          <p><strong>Points:</strong> <span className="font-semibold text-lg text-blue-600">{membership.mmbr_points}</span></p>
          <p><strong>Member Since:</strong> {new Date(membership.mmbr_creationdate).toLocaleDateString()}</p>
          <p><strong>Expires On:</strong> {new Date(membership.mmbr_expirydate).toLocaleDateString()}</p>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-6 text-gray-600">You are not a member yet.</p>
          <button
            onClick={handleCreateMembership}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Become a Member Now!'}
          </button>
        </div>
      )}
    </div>
  );
}