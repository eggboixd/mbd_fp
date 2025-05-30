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

    if (searchTerm.trim() !== '') {
      const cleanedSearchTerm = searchTerm.trim();
      query = query.or(`inst_name.ilike.%${cleanedSearchTerm}%,inst_type.ilike.%${cleanedSearchTerm}%`);
    }

    console.log('Executing query for instruments...');
    const { data, error: fetchError } = await query;

    if (fetchError) {
      // --- Improved Error Logging START ---
      console.error('Error fetching instruments (raw object):', fetchError);
      try {
        console.error('Error fetching instruments (JSON.stringify):', JSON.stringify(fetchError, null, 2));
      } catch (e) {
        console.error('Could not stringify fetchError:', e);
      }
      console.error('Error message:', fetchError.message);
      if (typeof fetchError === 'object' && fetchError !== null) {
        console.error('Error code:', (fetchError as { code?: string }).code);
        console.error('Error details:', (fetchError as { details?: string }).details);
        console.error('Error hint:', (fetchError as { hint?: string }).hint);
      }
      // --- Improved Error Logging END ---

      setError(fetchError.message || 'An unknown error occurred while fetching instruments.');
      setInstruments([]);
    } else {
      console.log('Fetched instruments data:', data);
      setInstruments(data || []);
    }
    setLoading(false);
  };

  // This useEffect is for fetching when the component mounts or searchTerm changes
  useEffect(() => {
    fetchInstruments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // This useEffect is for the realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('instrument-updates-page') // Slightly more unique channel name
      .on<Instrument>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Instrument' },
        (payload) => {
          console.log('Instrument change received!', payload);
          fetchInstruments(); // Refetch to get the latest list
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to instrument updates successfully!');
        } else if (err) {
          console.error("Realtime subscription error/status:", status, err);
          // Avoid overwriting a fetch error with a subscription error if one already exists
          if (!error) {
            setError("Realtime connection issue: " + (err?.message || status));
          }
        } else if (
          status === 'TIMED_OUT' ||
          status === 'CLOSED' ||
          status === 'CHANNEL_ERROR'
        ) {
          console.warn("Realtime subscription status:", status);
        }
      });

    return () => {
      supabase.removeChannel(channel)
        .then(() => console.log('Unsubscribed from instrument updates.'))
        .catch(err => console.error('Error unsubscribing from instrument updates:', err));
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]); // Dependency: re-subscribe if a fetch error was cleared, or just for initial setup. `[]` is also common here.

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Available Instruments 🎸</h1>
      <input
        type="text"
        placeholder="Search by name or type..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-6 p-3 border border-gray-300 rounded-md w-full md:w-2/3 lg:w-1/2 shadow-sm focus:ring-blue-500 focus:border-blue-500 block mx-auto"
      />

      {loading && <p className="text-center text-gray-600">Loading instruments...</p>}
      
      {error && (
        <div className="text-center text-red-600 bg-red-100 p-3 rounded-md mb-4">
            <p><strong>Error:</strong> {error}</p>
            <p className="text-sm mt-1">Please check the browser console for more details.</p>
        </div>
      )}

      {!loading && !error && instruments.length === 0 && (
        <p className="text-center text-gray-700">No instruments currently available matching your search criteria.</p>
      )}

      {!loading && !error && instruments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {instruments.map((instrument) => (
            <div key={instrument.inst_id} className="border p-5 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <h2 className="text-xl font-semibold mb-2 text-blue-700">{instrument.inst_name}</h2>
              <p className="text-gray-600 mb-1"><span className="font-medium">Type:</span> {instrument.inst_type}</p>
              <p className="text-gray-800 mb-1 font-semibold">Price: ${instrument.inst_rentalprice?.toString()}</p>
              <p className={`font-semibold mb-3 ${instrument.inst_status === 'Ready' ? 'text-green-600' : 'text-yellow-600'}`}>
                Status: {instrument.inst_status}
              </p>
              <div className="mt-auto">
                {instrument.inst_status === 'Ready' && (
                   <Link href={`/book/instrument/${instrument.inst_id}`}
                      className="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                      Book Now
                    </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}