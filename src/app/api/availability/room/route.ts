import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the admin client with the service role key to bypass RLS
const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const roomId = searchParams.get('roomId');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!roomId || !start || !end) {
            return NextResponse.json({ error: 'Missing roomId, start, or end parameters' }, { status: 400 });
        }

        const startDate = new Date(start);
        const endDate = new Date(end);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
            return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
        }

        // Perform the overlap check on the server with the corrected filter syntax
        const { data: conflictingBookings, error: checkError } = await supabaseAdmin
            .from('Rental_Transaction')
            .select('trsc_id', { count: 'exact' })
            .eq('Room_room_id', roomId)
            // CORRECTED: Removed extra parentheses from the filter string
            .or(`[trsc_rentstart,trsc_rentend).ov.${startDate.toISOString()},${endDate.toISOString()}`);


        if (checkError) {
            console.error("Server-side availability check error:", checkError);
            return NextResponse.json({ error: 'An error occurred while checking availability.' }, { status: 500 });
        }

        const isAvailable = !conflictingBookings || conflictingBookings.length === 0;

        // Return a simple JSON response
        return NextResponse.json({ isAvailable });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected server error occurred.';
        console.error('API Availability Check Unhandled Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}