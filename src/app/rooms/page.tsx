'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import Link from 'next/link';

type Room = Database['public']['Tables']['Room']['Row'];
// type Transaction = Database['public']['Tables']['Rental_Transaction']['Row'];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For simplicity, we'll show all rooms and users can check specific availability during booking.
  // A more complex UI would show available slots directly.

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await supabase.from('Room').select('*');

    if (fetchError) {
      console.error('Error fetching rooms:', fetchError);
      setError(fetchError.message);
      setRooms([]);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    // Realtime for Room data changes (e.g., new room added, name change)
    const roomChannel = supabase
      .channel('room-details-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Room' },
        (payload) => {
          console.log('Room detail change received!', payload);
          fetchRooms(); // Refetch rooms if details change
        }
      )
      .subscribe();

    // Realtime for transactions that affect room availability (more complex to show on list view)
    // For now, this just logs, actual availability check will be on booking.
    const transactionChannel = supabase
      .channel('room-booking-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Rental_Transaction' },
        (payload) => {
          console.log('Rental transaction change impacting rooms received!', payload);
          // Potentially refetch rooms or update availability status if displaying it here.
          // For this example, we keep it simple. Users check on the booking page.
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Available Rooms 🚪</h1>
      {/* TODO: Add date/time pickers for a more refined availability search */}
      {/* <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mb-4 p-2 border rounded" /> */}

      {loading && <p>Loading rooms...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      {!loading && !error && rooms.length === 0 && <p>No rooms currently available.</p>}

      {!loading && !error && rooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div key={room.room_id} className="border p-4 rounded-lg shadow-md bg-white">
              <h2 className="text-xl font-semibold mb-2">{room.room_name}</h2>
              <p className="text-gray-700">Size: {room.room_size}</p>
              <p className="text-gray-700">Rate: ${room.room_rentrate?.toString()}/hr (example rate)</p>
              {/* Availability display here would be more complex, requiring checks against Rental_Transaction */}
              <Link href={`/book/room/${room.room_id}`}
                 className="mt-4 inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                Check Availability & Book
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}