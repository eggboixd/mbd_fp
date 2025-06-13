import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const {
            room_id,
            student_stdn_id,
            rent_start,
            rent_end,
            payment_method = 'Card',
        } = await req.json();

        if (!room_id || !student_stdn_id || !rent_start || !rent_end) {
            return NextResponse.json({ error: 'Missing required booking details.' }, { status: 400 });
        }

        const startDate = new Date(rent_start);
        const endDate = new Date(rent_end);

        // 1. Check for conflicting bookings for the same room
        const { data: conflictingBookings, error: checkError } = await supabaseAdmin
            .from('Rental_Transaction')
            .select('trsc_id', { count: 'exact' }) // just need to know if any exist
            .eq('Room_room_id', room_id)
            .or(`[trsc_rentstart,trsc_rentend).ov.[${startDate.toISOString()},${endDate.toISOString()})`); // Check for overlapping time ranges

        if (checkError) {
            console.error("Error checking room availability:", checkError);
            return NextResponse.json({ error: 'Could not check room availability.' }, { status: 500 });
        }
        if (conflictingBookings && conflictingBookings.length > 0) {
            return NextResponse.json({ error: 'This time slot is no longer available.' }, { status: 409 }); // 409 Conflict
        }

        // 2. Fetch room details to calculate price
        const { data: room, error: roomError } = await supabaseAdmin
            .from('Room')
            .select('room_rentrate')
            .eq('room_id', room_id)
            .single();
        
        if (roomError) {
            return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
        }

        // 3. Calculate total price
        const rentalRate = room.room_rentrate || 0;
        const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
        const totalPrice = rentalRate * Math.max(1, Math.ceil(hours));

        // 4. Get an employee
        const { data: employees, error: empError } = await supabaseAdmin.from('Employee').select('empl_nik').limit(1);
        if (empError || !employees || employees.length === 0) {
            return NextResponse.json({ error: 'Internal server error: Could not assign employee.' }, { status: 500 });
        }
        const employee_empl_nik = employees[0].empl_nik;

        // 5. Create the Rental_Transaction record
        const { data: transactionData, error: transactionError } = await supabaseAdmin
            .from('Rental_Transaction')
            .insert({
                trsc_transactiondate: new Date().toISOString(),
                trsc_paymentmethod: payment_method,
                trsc_rentstart: startDate.toISOString(),
                trsc_rentend: endDate.toISOString(),
                trsc_totalprice: totalPrice,
                Student_stdn_id: student_stdn_id,
                Room_room_id: room_id,
                Employee_empl_nik: employee_empl_nik
            })
            .select('trsc_id')
            .single();

        if (transactionError) {
            console.error('Room transaction insert error:', transactionError);
            return NextResponse.json({ error: `Failed to create transaction: ${transactionError.message}` }, { status: 500 });
        }

        // No need to link instruments here, but we could award points
        const newTransactionId = transactionData.trsc_id;

        // Award points if applicable
        // ... (you can copy the point-awarding logic from the instrument booking route here)

        return NextResponse.json({ message: 'Room booking successful!', transactionId: newTransactionId }, { status: 201 });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error('API Room Booking Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}