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

        // 1. Final availability check (server-side for security)
        const { data: conflictingBookings, error: checkError } = await supabaseAdmin
            .from('Rental_Transaction')
            .select('trsc_id', { count: 'exact' })
            .eq('Room_room_id', room_id)
            .lt('trsc_rentstart', endDate.toISOString())
            .gt('trsc_rentend', startDate.toISOString());

        if (checkError) {
            console.error("Error re-checking room availability before booking:", checkError);
            return NextResponse.json({ error: 'Could not confirm room availability.' }, { status: 500 });
        }
        if (conflictingBookings && conflictingBookings.length > 0) {
            return NextResponse.json({ error: 'This time slot was just booked by someone else. Please try another time.' }, { status: 409 });
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

        const newTransactionId = transactionData.trsc_id;

        // --- ADDED THIS BLOCK ---
        // 6. Award Membership Points if the student is a member
        const { data: membership } = await supabaseAdmin
            .from('Membership')
            .select('mmbr_id, mmbr_points')
            .eq('Student_stdn_id', student_stdn_id)
            .single();

        if (membership) {
            // Define your points calculation rule
            const pointsToAdd = Math.floor(totalPrice / 10000); // Example: 1 point per 10,000 spent
            
            if (pointsToAdd > 0) {
              const newPoints = (membership.mmbr_points || 0) + pointsToAdd;
              
              // Update the points in the Membership table
              await supabaseAdmin
                  .from('Membership')
                  .update({ mmbr_points: newPoints })
                  .eq('mmbr_id', membership.mmbr_id);
              
              console.log(`Awarded ${pointsToAdd} points for room booking. New total: ${newPoints}`);
            }
        }
        // --- END OF BLOCK ---

        return NextResponse.json({ message: 'Room booking successful!', transactionId: newTransactionId }, { status: 201 });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error('API Room Booking Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}