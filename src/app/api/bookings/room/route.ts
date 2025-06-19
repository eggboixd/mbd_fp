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

        // Final availability check (this is still important)
        const { data: conflictingBookings, error: checkError } = await supabaseAdmin
            .from('Rental_Transaction')
            .select('trsc_id', { count: 'exact' })
            .eq('Room_room_id', room_id)
            .lt('trsc_rentstart', endDate.toISOString())
            .gt('trsc_rentend', startDate.toISOString());

        if (checkError) {
            return NextResponse.json({ error: 'Could not confirm room availability.' }, { status: 500 });
        }
        if (conflictingBookings && conflictingBookings.length > 0) {
            return NextResponse.json({ error: 'This time slot was just booked by someone else.' }, { status: 409 });
        }

        // Get an employee
        const { data: employees, error: empError } = await supabaseAdmin.from('Employee').select('empl_nik').limit(1);
        if (empError || !employees || employees.length === 0) {
            return NextResponse.json({ error: 'Internal server error: Could not assign employee.' }, { status: 500 });
        }
        const employee_empl_nik = employees[0].empl_nik;

        // Create the Rental_Transaction record
        // REMOVED: Fetching room details and calculating totalPrice.
        // The database trigger will now handle the price calculation automatically.
        const { data: transactionData, error: transactionError } = await supabaseAdmin
            .from('Rental_Transaction')
            .insert({
                trsc_transactiondate: new Date().toISOString(),
                trsc_paymentmethod: payment_method,
                trsc_rentstart: startDate.toISOString(),
                trsc_rentend: endDate.toISOString(),
                // We no longer send trsc_totalprice from here
                Student_stdn_id: student_stdn_id,
                Room_room_id: room_id,
                Employee_empl_nik: employee_empl_nik
            })
            .select('trsc_id')
            .single();

        if (transactionError) {
            return NextResponse.json({ error: `Failed to create transaction: ${transactionError.message}` }, { status: 500 });
        }

        const newTransactionId = transactionData.trsc_id;

        // Award points logic can remain here (you would add it back if needed)
        // ...

        return NextResponse.json({ message: 'Room booking successful!', transactionId: newTransactionId }, { status: 201 });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}