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
      // REMOVED: .eq('inst_status', 'Ready'); 
      // Now we fetch all instruments to display their status.
      .order('inst_name', { ascending: true }); 

    if (searchTerm.trim() !== '') {
      const cleanedSearchTerm = searchTerm.trim();
      query = query.or(`inst_name.ilike.%${cleanedSearchTerm}%,inst_type.ilike.%${cleanedSearchTerm}%`);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching instruments:', fetchError);
      setError(fetchError.message);
      setInstruments([]);
    } else {
      console.log('Fetched all instruments data:', data);
      setInstruments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstruments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);
  useEffect(() => {
    const channel = supabase
      .channel('instrument-updates-page')
      .on<Instrument>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Instrument' },
        (payload) => {
          console.log('Instrument change received!', payload);
          const updatedInstrument = payload.new as Instrument;
          setInstruments(currentInstruments =>
            currentInstruments.map(inst =>
              inst.inst_id === updatedInstrument.inst_id ? updatedInstrument : inst
            )
          );
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to instrument updates successfully!');
        } else if (err) {
          console.error("Realtime subscription error/status:", status, err);
          if (!error) {
            setError("Realtime connection issue: " + (err?.message || status));
          }
        }
      });

    return () => {
      supabase.removeChannel(channel)
        .then(() => console.log('Unsubscribed from instrument updates.'))
        .catch(err => console.error('Error unsubscribing from instrument updates:', err));
    };
  }, [error]); 

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Our Instruments</h1>
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
        </div>
      )}

      {!loading && !error && instruments.length === 0 && (
        <p className="text-center text-gray-700">No instruments found.</p>
      )}

      {!loading && !error && instruments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {instruments.map((instrument) => {
            const isAvailable = instrument.inst_status === 'Ready';
            return (
              <div key={instrument.inst_id} className="border p-5 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <h2 className="text-xl font-semibold mb-2 text-blue-700">{instrument.inst_name}</h2>
                <p className="text-gray-600 mb-1"><span className="font-medium">Type:</span> {instrument.inst_type}</p>
                <p className="text-gray-800 mb-1 font-semibold">Price: Rp.{instrument.inst_rentalprice?.toString()}</p>
                <p className={`font-semibold mb-4 ${isAvailable ? 'text-green-600' : 'text-orange-600'}`}>
                  Status: {isAvailable ? 'Available' : 'Not Available'}
                </p>
                <div className="mt-auto"> 
                  {isAvailable ? (
                    <Link href={`/book/instrument/${instrument.inst_id}`}
                          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                      Book Now
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="block w-full text-center bg-gray-400 text-gray-700 font-bold py-2 px-4 rounded-md cursor-not-allowed">
                      Unavailable
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}