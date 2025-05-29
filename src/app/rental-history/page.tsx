'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider'; // Adjust path
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !studentId) {
      router.push('/login?redirect=/rental-history');
      return;
    }

    const fetchRentalHistory = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('Rental_Transaction')
        .select(`
          *,
          Room (room_name),
          Transaction_Instrument (
            Instrument (inst_name, inst_type)
          )
        `)
        .eq('Student_stdn_id', studentId)
        .order('trsc_transactionDate', { ascending: false });

      if (fetchError) {
        console.error('Error fetching rental history:', fetchError);
        setError(fetchError.message);
      } else {
        setRentals(data as RentalHistoryItem[] || []);
      }
      setLoading(false);
    };

    fetchRentalHistory();

    // Realtime for new transactions for this student
    const channel = supabase
      .channel(`rental-history-${studentId}`)
      .on<Database['public']['Tables']['Rental_Transaction']['Row']>(
        'postgres_changes',
        {
          event: 'INSERT', // Or '*' if you want to see updates/deletes too
          schema: 'public',
          table: 'Rental_Transaction',
          filter: `Student_stdn_id=eq.${studentId}`
        },
        (payload) => {
          console.log('New rental added to history:', payload);
          // Refetch or prepend new item
          fetchRentalHistory();
        }
      )
      .subscribe(err => { if(err) console.error("Rental history subscription error", err)});

    return () => {
      supabase.removeChannel(channel);
    };

  }, [user, studentId, authLoading, router]);

  if (authLoading || loading) return <p className="text-center mt-10">Loading rental history...</p>;
  if (error) return <p className="text-red-500 bg-red-100 p-3 rounded text-center mt-10">{error}</p>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Your Rental History 🧾</h1>
      {rentals.length === 0 ? (
        <p>You have no past rentals. <Link href="/instruments" className="text-blue-500 hover:underline">Start renting now!</Link></p>
      ) : (
        <div className="space-y-6">
          {rentals.map((rental) => (
            <div key={rental.trsc_id} className="p-6 border rounded-lg shadow-md bg-white">
              <h2 className="text-xl font-semibold mb-2">Transaction ID: {rental.trsc_id}</h2>
              <p><strong>Date:</strong> {new Date(rental.trsc_transactiondate).toLocaleString()}</p>
              <p><strong>Rent Start:</strong> {new Date(rental.trsc_rentstart).toLocaleString()}</p>
              <p><strong>Rent End:</strong> {new Date(rental.trsc_rentend).toLocaleString()}</p>
              <p><strong>Total Price:</strong> ${rental.trsc_totalprice?.toString()}</p>
              {rental.Room?.room_name && <p><strong>Room:</strong> {rental.Room.room_name}</p>}
              {rental.Transaction_Instrument && rental.Transaction_Instrument.length > 0 && (
                <div className="mt-2">
                  <strong>Instruments Rented:</strong>
                  <ul className="list-disc list-inside ml-4">
                    {rental.Transaction_Instrument.map((ti, index) => (
                      <li key={`<span class="math-inline">\{rental\.trsc\_id\}\-</span>{ti.Instrument?.inst_name}-${index}`}>
                        {ti.Instrument?.inst_name || 'N/A'} ({ti.Instrument?.inst_type || 'N/A'})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
               {rental.trsc_returndate && <p className="text-sm text-gray-600 mt-1">Returned on: {new Date(rental.trsc_returndate).toLocaleString()}</p>}
               {rental.trsc_latefee && rental.trsc_latefee > 0 && <p className="text-sm text-red-600">Late Fee: ${rental.trsc_latefee.toString()}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}