'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import Link from 'next/link';

type Instrument = Database['public']['Tables']['Instrument']['Row'];

export default function InstrumentsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchInstruments = async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('Instrument')
      .select('*')
      .eq('inst_status', 'Ready'); // Only 'Ready' instruments

    if (searchTerm) {
      query = query.or(`inst_name.ilike.%<span class="math-inline">\{searchTerm\}%,inst\_type\.ilike\.%</span>{searchTerm}%`);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching instruments:', fetchError);
      setError(fetchError.message);
      setInstruments([]);
    } else {
      setInstruments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstruments(); // Initial fetch

    const channel = supabase
      .channel('instrument-updates')
      .on<Instrument>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Instrument' },
        (payload) => {
          console.log('Instrument change received!', payload);
          // Refetch to get the latest list based on current filters
          // More sophisticated logic could update the specific item
          fetchInstruments();
        }
      )
      .subscribe((status, err) => {
        if (err) {
            console.error("Realtime subscription error:", err);
            setError("Realtime connection failed.");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]); // Refetch when search term changes

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Available Instruments 🎸</h1>
      <input
        type="text"
        placeholder="Search by name or type..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-6 p-2 border border-gray-300 rounded-md w-full md:w-1/2"
      />

      {loading && <p>Loading instruments...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && instruments.length === 0 && (
        <p>No instruments currently available matching your search.</p>
      )}

      {!loading && !error && instruments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instruments.map((instrument) => (
            <div key={instrument.inst_id} className="border p-4 rounded-lg shadow-md bg-white">
              <h2 className="text-xl font-semibold mb-2">{instrument.inst_name}</h2>
              <p className="text-gray-700">Type: {instrument.inst_type}</p>
              <p className="text-gray-700">Price: ${instrument.inst_rentalprice?.toString()}</p>
              <p className={`font-semibold ${instrument.inst_status === 'Ready' ? 'text-green-500' : 'text-red-500'}`}>
                Status: {instrument.inst_status}
              </p>
              {instrument.inst_status === 'Ready' && (
                 <Link href={`/book/instrument/${instrument.inst_id}`}
                    className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                    Book Now
                  </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}