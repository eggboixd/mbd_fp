'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import { Database } from '@/types/supabase';
// import Link from 'next/link';
import { useRouter } from 'next/navigation';
import InstrumentRentalsList from '@/components/InstrumentRentalsList';
import RoomRentalsList from '@/components/RoomRentalsList';

// Define a more specific type for the joined data
export type RentalHistoryItem = Database['public']['Tables']['Rental_Transaction']['Row'] & {
  Room: Pick<Database['public']['Tables']['Room']['Row'], 'room_name'> | null;
  Transaction_Instrument: Array<{
    Instrument: Pick<Database['public']['Tables']['Instrument']['Row'], 'inst_name' | 'inst_type'> | null;
  }>;
};

export default function RentalHistoryPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const router = useRouter();
  
  const [rentals, setRentals] = useState<RentalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'instruments' | 'rooms'>('instruments');

  const fetchRentalHistory = useCallback(async () => {
    if (!profile?.stdn_id) return;

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
      .eq('Student_stdn_id', profile.stdn_id)
      .order('trsc_transactiondate', { ascending: false });

    if (fetchError) {
      console.error('Error fetching rental history:', fetchError);
      setError(fetchError.message);
    } else {
      setRentals(data as RentalHistoryItem[] || []);
    }
    setLoading(false);
  }, [profile?.stdn_id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile) {
      router.push('/login?redirect=/rental-history');
      return;
    }
    fetchRentalHistory();
  }, [user, profile, authLoading, router, fetchRentalHistory]);

  const handlePayment = async (transactionId: string) => {
    console.log(`Simulating payment for transaction: ${transactionId}`);
    try {
      const response = await fetch('/api/payments/mark-as-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });

      const updatedTransaction = await response.json();

      if (!response.ok) {
        throw new Error(updatedTransaction.error || "Payment failed.");
      }

      // Update the state locally for an instant UI change without a full refetch
      setRentals(currentRentals => 
        currentRentals.map(r => 
          r.trsc_id === updatedTransaction.trsc_id ? { ...r, ...updatedTransaction } : r
        )
      );
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  const { instrumentRentals, roomRentals } = useMemo(() => {
    const instruments = rentals.filter(r => r.Transaction_Instrument.length > 0);
    const rooms = rentals.filter(r => r.Room !== null);
    return { instrumentRentals: instruments, roomRentals: rooms };
  }, [rentals]);

  if (authLoading || (loading && rentals.length === 0)) {
    return <p className="text-center mt-10">Loading rental history...</p>;
  }

  if (error) {
    return <p className="text-red-500 bg-red-100 p-3 rounded text-center mt-10">{error}</p>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-amber-50">My Rentals 🧾</h1>
      
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('instruments')}
            className={`${
              activeTab === 'instruments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Instruments ({instrumentRentals.length})
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`${
              activeTab === 'rooms'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
          >
            Rooms ({roomRentals.length})
          </button>
        </nav>
      </div>

      {/* Content based on active tab */}
      <div>
        {activeTab === 'instruments' && (
          <InstrumentRentalsList rentals={instrumentRentals} onPay={handlePayment} />
        )}
        {activeTab === 'rooms' && (
          <RoomRentalsList rentals={roomRentals} onPay={handlePayment} />
        )}
      </div>
    </div>
  );
}
