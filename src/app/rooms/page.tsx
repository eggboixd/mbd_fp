'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import Link from 'next/link';

type Room = Database['public']['Tables']['Room']['Row'];

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRooms = async () => {
    setLoading(true);
    setError(null);
    let query = supabase.from('Room').select('*').order('room_name', { ascending: true });
    if (searchTerm.trim() !== '') {
      const cleanedSearchTerm = searchTerm.trim();
      query = query.or(`room_name.ilike.%${cleanedSearchTerm}%,room_size.ilike.%${cleanedSearchTerm}%`);
    }
    const { data, error: fetchError } = await query;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  useEffect(() => {
    const roomChannel = supabase
      .channel('room-details-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Room' },
        (payload) => {
          console.log('Room detail change received!', payload);
          fetchRooms();
        }
      )
      .subscribe();
    const transactionChannel = supabase
      .channel('room-booking-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Rental_Transaction' },
        (payload) => {
          console.log('Rental transaction change impacting rooms received!', payload);
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
      <h1 className="text-3xl font-bold mb-6 text-center">Our Rooms</h1>
      <input
        type="text"
        placeholder="Search by name or size..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-6 p-3 border border-gray-300 rounded-md w-full md:w-2/3 lg:w-1/2 shadow-sm focus:ring-blue-500 focus:border-blue-500 block mx-auto"
      />
      {loading && <p className="text-center text-gray-600">Loading rooms...</p>}
      {error && (
        <div className="text-center text-red-600 bg-red-100 p-3 rounded-md mb-4">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
      {!loading && !error && rooms.length === 0 && (
        <p className="text-center text-gray-700">No rooms found.</p>
      )}
      {!loading && !error && rooms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div key={room.room_id} className="border p-5 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <h2 className="text-xl font-semibold mb-2 text-blue-700">{room.room_name}</h2>
              <p className="text-gray-600 mb-1"><span className="font-medium">Size:</span> {room.room_size}</p>
              <p className="text-gray-800 mb-1 font-semibold">Rate: Rp.{room.room_rentrate?.toString()}/hr</p>
              <div className="mt-auto">
                <Link href={`/book/room/${room.room_id}`}
                  className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-300">
                  Check Availability & Book
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}