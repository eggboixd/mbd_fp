'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import { useAuth } from '@/components/AuthProvider'; // Adjust path

type Instrument = Database['public']['Tables']['Instrument']['Row'];

export default function BookInstrumentPage() {
  const params = useParams();
  const router = useRouter();
  const { user, studentId, isLoading: authLoading } = useAuth();
  const instrumentId = params.id as string;

  const [instrument, setInstrument] = useState<Instrument | null>(null);
  const [rentStart, setRentStart] = useState(''); // Format: YYYY-MM-DDTHH:MM
  const [rentEnd, setRentEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);

  useEffect(() => {
    if (instrumentId) {
      const fetchInstrument = async () => {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('Instrument')
          .select('*')
          .eq('inst_id', instrumentId)
          .single();

        if (fetchError) {
          setError('Failed to load instrument details.');
          console.error(fetchError);
        } else if (data) {
          setInstrument(data);
          if (data.inst_status !== 'Ready') {
            setError(`Instrument "<span class="math-inline">\{data\.inst\_name\}" is currently not available \(</span>{data.inst_status}).`);
          }
        } else {
            setError('Instrument not found.');
        }
        setLoading(false);
      };
      fetchInstrument();
    }
  }, [instrumentId]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBookingMessage(null);

    if (!user || !studentId) {
      setError('You must be logged in as a student to book an instrument.');
      router.push(`/login?redirect=/book/instrument/${instrumentId}`);
      return;
    }
    if (!instrument || instrument.inst_status !== 'Ready') {
      setError('This instrument cannot be booked at this time.');
      return;
    }
    if (!rentStart || !rentEnd) {
        setError('Please select rent start and end times.');
        return;
    }
    if (new Date(rentStart) >= new Date(rentEnd)) {
        setError('Rent end time must be after start time.');
        return;
    }
    if (new Date(rentStart) < new Date()) {
        setError('Rent start time cannot be in the past.');
        return;
    }


    setLoading(true);
    try {
      const response = await fetch('/api/bookings/instrument', { // API Route
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrument_id: instrument.inst_id,
          student_stdn_id: studentId, // From AuthProvider
          rent_start: rentStart,
          rent_end: rentEnd,
          payment_method: 'Online', // Example
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Booking failed.');
      }
      setBookingMessage(`Booking successful! Transaction ID: ${result.transactionId}. You will be redirected shortly.`);
      // Award points if applicable (can be done in API or triggered by DB)
      // For now, let's assume API handles it or a trigger.
      setTimeout(() => router.push('/rental-history'), 3000);

    } catch (apiError: unknown) {
      if (apiError instanceof Error) {
        setError(apiError.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!instrument && !error) return <p>Instrument not found.</p>;

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 border rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-4">Book: {instrument?.inst_name}</h1>
      {error && <p className="text-red-500 bg-red-100 p-3 rounded mb-4">{error}</p>}
      {bookingMessage && <p className="text-green-500 bg-green-100 p-3 rounded mb-4">{bookingMessage}</p>}

      {instrument && instrument.inst_status === 'Ready' && !bookingMessage && (
        <form onSubmit={handleBooking} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Instrument Type:</label>
            <p>{instrument.inst_type}</p>
          </div>
          <div>
            <label className="block text-sm font-medium">Rental Price:</label>
            <p>${instrument.inst_rentalprice?.toString()}</p>
          </div>
          <div>
            <label htmlFor="rentStart" className="block text-sm font-medium">Rent Start Time:</label>
            <input type="datetime-local" id="rentStart" value={rentStart} onChange={(e) => setRentStart(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label htmlFor="rentEnd" className="block text-sm font-medium">Rent End Time:</label>
            <input type="datetime-local" id="rentEnd" value={rentEnd} onChange={(e) => setRentEnd(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <button type="submit" disabled={loading || !user || !studentId} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
            {loading ? 'Processing...' : 'Book Now'}
          </button>
          {!user && <p className="text-sm text-center mt-2">Please <Link href="/login" className="text-blue-500 hover:underline">log in</Link> to book.</p>}
        </form>
      )}
    </div>
  );
}