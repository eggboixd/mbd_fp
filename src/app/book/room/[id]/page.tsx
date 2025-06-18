'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Database } from '@/types/supabase';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';

type Room = Database['public']['Tables']['Room']['Row'];

export default function BookRoomPage() {
  const params = useParams();
  const router = useRouter();
  // CORRECTED: Get the full 'profile' object from useAuth, not the old 'studentId'
  const { user, profile, isLoading: authLoading } = useAuth(); 
  const roomId = params.id as string;

  const [room, setRoom] = useState<Room | null>(null);
  const [rentStart, setRentStart] = useState('');
  const [rentEnd, setRentEnd] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availabilityMessage, setAvailabilityMessage] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Effect to fetch the static details of the room
  useEffect(() => {
    if (!roomId) {
      setError("Room ID is missing.");
      setPageLoading(false);
      return;
    }

    const fetchRoomDetails = async () => {
      setPageLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('Room')
        .select('*')
        .eq('room_id', roomId)
        .single();

      if (fetchError) {
        console.error('Error fetching room details:', fetchError);
        setError(`Failed to load room details: ${fetchError.message}`);
      } else if (data) {
        setRoom(data);
      } else {
        setError('Room not found.');
      }
      setPageLoading(false);
    };

    fetchRoomDetails();
  }, [roomId]);

  // Effect to check availability by calling our secure API route
  useEffect(() => {
    if (!rentStart || !rentEnd) {
      setAvailabilityMessage('');
      setIsAvailable(null);
      return;
    }
    const startDate = new Date(rentStart);
    const endDate = new Date(rentEnd);
    if (startDate >= endDate) {
      setAvailabilityMessage('');
      setIsAvailable(null);
      return;
    }

    const handler = setTimeout(async () => {
      setAvailabilityMessage('Checking availability...');
      setIsAvailable(null);

      try {
        const response = await fetch(`/api/availability/room?roomId=${roomId}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
        
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to check availability.');
        }

        if (result.isAvailable) {
          setAvailabilityMessage('This time slot is available!');
          setIsAvailable(true);
        } else {
          setAvailabilityMessage('This time slot is unavailable.');
          setIsAvailable(false);
        }

      } catch (err: unknown) {
        console.error("Client-side availability check error:", err);
        setAvailabilityMessage('Could not check availability.');
        setIsAvailable(false);
      }
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [rentStart, rentEnd, roomId]);


  const handleBookingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // CORRECTED: Check for user and the profile object
    if (!user || !profile?.stdn_id) {
      setError('You must be logged in as a student to book. Redirecting...');
      setTimeout(() => router.push(`/login?redirect=/book/room/${roomId}`), 2000);
      return;
    }
    
    if (isAvailable !== true) {
      setError('This room is not available for the selected time slot. Please choose another time.');
      return;
    }

    setBookingInProgress(true);

    try {
      const response = await fetch('/api/bookings/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_id: roomId,
          student_stdn_id: profile.stdn_id, // CORRECTED: Use profile.stdn_id
          rent_start: new Date(rentStart).toISOString(),
          rent_end: new Date(rentEnd).toISOString(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `Booking failed with status ${response.status}`);
      }

      setSuccessMessage(`Booking successful! Transaction ID: ${result.transactionId}. You will be redirected to your rental history.`);
      setTimeout(() => router.push('/rental-history'), 4000);

    } catch (apiError: unknown) {
      console.error('Booking API error:', apiError);
      if (apiError instanceof Error) {
        setError(apiError.message || 'An unexpected error occurred during booking.');
      } else {
        setError('An unexpected error occurred during booking.');
      }
    } finally {
      setBookingInProgress(false);
    }
  };

  if (authLoading || pageLoading) {
    return <p className="text-center mt-10 text-gray-700">Loading booking details...</p>;
  }

  if (!room) {
    return (
      <div className="text-center mt-10">
        <p className="text-red-600 bg-red-100 p-4 rounded-md mb-4">{error || 'Room not found.'}</p>
        <Link href="/rooms" className="text-blue-600 hover:underline">&larr; Back to Rooms</Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Book Room: <span className="text-green-600">{room.room_name}</span>
      </h1>

      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        <div className="mb-4 text-gray-900">
          <p className="text-lg"><span className="text-gray-900 font-semibold">Size:</span> {room.room_size}</p>
          <p className="text-lg"><span className="text-gray-900 font-semibold">Rental Rate:</span> ${room.room_rentrate?.toString()} / unit</p>
        </div>

        {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
        {successMessage && <p className="mb-4 text-green-600 bg-green-100 p-3 rounded-md">{successMessage}</p>}

        {!successMessage && (
          <form onSubmit={handleBookingSubmit} className="space-y-5">
            <div>
              <label htmlFor="rentStart" className="block text-sm font-medium text-gray-700 mb-1">
                Rent Start Date & Time:
              </label>
              <input
                type="datetime-local"
                id="rentStart"
                value={rentStart}
                onChange={(e) => setRentStart(e.target.value)}
                required
                className="text-gray-900 mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <label htmlFor="rentEnd" className="block text-sm font-medium text-gray-700 mb-1">
                Rent End Date & Time:
              </label>
              <input
                type="datetime-local"
                id="rentEnd"
                value={rentEnd}
                onChange={(e) => setRentEnd(e.target.value)}
                required
                className="text-gray-900 mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                min={rentStart || new Date().toISOString().slice(0, 16)}
              />
            </div>

            {availabilityMessage && (
              <p className={`text-sm text-center font-semibold p-2 rounded-md ${isAvailable === true ? 'text-green-800 bg-green-100' : isAvailable === false ? 'text-red-800 bg-red-100' : 'text-gray-800 bg-gray-100'}`}>
                {availabilityMessage}
              </p>
            )}

            <button
              type="submit"
              // CORRECTED: Use 'profile' for the check
              disabled={bookingInProgress || !user || !profile || isAvailable !== true}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {bookingInProgress ? 'Processing Booking...' : 'Confirm Booking'}
            </button>
          </form>
        )}
      </div>

       <div className="mt-6 text-center">
            <Link href="/rooms" className="text-blue-600 hover:underline">
                &larr; Back to Rooms
            </Link>
        </div>
    </div>
  );
}
