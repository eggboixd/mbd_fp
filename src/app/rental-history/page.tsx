'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider'; // Adjust path if needed
import { Database } from '@/types/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Define a more specific type for the joined data
type RentalHistoryItem = Database['public']['Tables']['Rental_Transaction']['Row'] & {
  Room: Pick<Database['public']['Tables']['Room']['Row'], 'room_name'> | null;
  Transaction_Instrument: Array<{
    Instrument: Pick<Database['public']['Tables']['Instrument']['Row'], 'inst_name' | 'inst_type'> | null;
  }>;
};


export default function RentalHistoryPage() {
  const { user, studentId, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [rentals, setRentals] = useState<RentalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Page-level error state

  useEffect(() => {
    if (authLoading) {
      setLoading(true); // Keep loading true while auth is resolving
      return;
    }
    if (!user || !studentId) {
      router.push('/login?redirect=/rental-history');
      return; // Important to return
    }

    setLoading(true); // Set loading before fetching

    const fetchRentalHistory = async () => {
      setError(null); // Clear previous page errors
      console.log(`Fetching rental history for studentId: ${studentId}`);
      const { data, error: fetchError } = await supabase
        .from('Rental_Transaction')
        .select(`
          *,
          Room (room_name),
          Transaction_Instrument (
            Instrument (inst_name, inst_type)
          )
        `)
        .eq('Student_stdn_id', studentId) // Ensure your DB column name is correct (Student_stdn_id vs "Student_stdn_id")
        .order('trsc_transactiondate', { ascending: false });

      if (fetchError) {
        console.error('Error fetching rental history (raw):', fetchError);
        console.error('Error fetching rental history (stringified):', JSON.stringify(fetchError, null, 2));
        setError(fetchError.message || "Failed to load rental history.");
      } else {
        console.log('Fetched rental history data:', data);
        setRentals(data as RentalHistoryItem[] || []);
      }
      setLoading(false);
    };

    fetchRentalHistory();

    // Realtime for new transactions for this student
    const channel = supabase
      .channel(`rental-history-${studentId}`) // Unique channel name per student
      .on<Database['public']['Tables']['Rental_Transaction']['Row']>(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new rentals to add to history
          schema: 'public',
          table: 'Rental_Transaction',
          filter: `Student_stdn_id=eq.${studentId}`
        },
        (payload) => {
          console.log(`New rental added to history for ${studentId}:`, payload);
          // Refetch or prepend new item. Refetching is simpler.
          fetchRentalHistory();
        }
      )
      // Updated .subscribe() callback:
      .subscribe((status, subscriptionError) => { // Renamed 'err' to 'subscriptionError'
        if (status === 'SUBSCRIBED') {
          console.log(`Successfully subscribed to rental history updates for student ${studentId}!`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`Rental history subscription status for ${studentId}: ${status}`);
          if (subscriptionError) {
            console.error(`Rental history subscription error details for ${studentId}:`, subscriptionError);
            if (!error) { // Only set page error if there isn't one already
              setError("Realtime connection issue for rental history: " + (subscriptionError?.message || status));
            }
          }
        } else if (status === 'CLOSED') {
          console.log(`Rental history subscription channel for ${studentId} was CLOSED.`);
        } else {
          console.log(`Rental history subscription for ${studentId}: unhandled status - ${status}`);
        }
      });

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
          .then(() => console.log(`Unsubscribed from rental history for ${studentId}.`))
          .catch(err => console.error(`Error unsubscribing from rental history for ${studentId}:`, err));
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, studentId, authLoading, router]); // Removed 'error' from here

  if (authLoading || (loading && !error) ) {
    return <p className="text-center mt-10 text-gray-700">Loading rental history...</p>;
  }

  if (error) {
    return (
        <div className="max-w-lg mx-auto mt-10 p-6 text-center">
            <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>
            <button onClick={() => router.refresh()} className="text-blue-600 hover:underline">Try again</button>
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">Your Rental History 🧾</h1>
      {rentals.length === 0 ? (
        <div className="text-center py-10">
            <p className="text-xl text-gray-600 mb-4">You have no past rentals.</p>
            <Link href="/instruments" className="text-lg text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors duration-300">
                Start renting now! &rarr;
            </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {rentals.map((rental) => (
            <div key={rental.trsc_id} className="p-6 border border-gray-200 rounded-xl shadow-lg bg-white hover:shadow-2xl transition-shadow duration-300">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-blue-700 mb-2 sm:mb-0">Transaction ID: <span className="font-mono">{rental.trsc_id}</span></h2>
                <p className="text-sm text-gray-500"><strong>Date:</strong> {new Date(rental.trsc_transactiondate).toLocaleString()}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-gray-700 mb-3">
                <p><strong>Rent Start:</strong> {new Date(rental.trsc_rentstart).toLocaleString()}</p>
                <p><strong>Rent End:</strong> {new Date(rental.trsc_rentend).toLocaleString()}</p>
                <p><strong>Total Price:</strong> <span className="font-semibold text-gray-800">${rental.trsc_totalprice?.toString()}</span></p>
                {rental.Room?.room_name && <p><strong>Room:</strong> {rental.Room.room_name}</p>}
                {rental.trsc_returndate && <p className="text-sm text-gray-600"><strong>Returned:</strong> {new Date(rental.trsc_returndate).toLocaleString()}</p>}
                {rental.trsc_latefee && rental.trsc_latefee > 0 && <p className="text-sm text-red-600 font-semibold"><strong>Late Fee:</strong> ${rental.trsc_latefee.toString()}</p>}
              </div>

              {rental.Transaction_Instrument && rental.Transaction_Instrument.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <strong className="block text-md font-medium text-gray-700 mb-2">Instruments Rented:</strong>
                  <ul className="list-disc list-inside ml-1 space-y-1">
                    {rental.Transaction_Instrument.map((ti, index) => (
                      // Corrected key for the list item
                      <li key={`${rental.trsc_id}-instrument-${ti.Instrument?.inst_name || index}`} className="text-gray-600">
                        {ti.Instrument?.inst_name || 'N/A'} ({ti.Instrument?.inst_type || 'N/A'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}