// import { supabase } from '@/lib/supabaseClient'; // Use the admin client for sensitive operations
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { NextRequest, NextResponse } from 'next/server';

// It's often better to use the service_role key for operations like this
// to bypass RLS for trusted server-side logic.
// Ensure this is NOT exposed to the client.
const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Store this securely in .env.local
);


export async function POST(req: NextRequest) {
    try {
        const {
            instrument_id,
            student_stdn_id,
            rent_start,
            rent_end,
            payment_method = 'Card', // Default or from request
            room_id = null // Optional room for this transaction
        } = await req.json();

        if (!instrument_id || !student_stdn_id || !rent_start || !rent_end) {
            return NextResponse.json({ error: 'Missing required booking details.' }, { status: 400 });
        }

        // 0. Validate student exists (optional, RLS on insert should handle linked student)
        const { data: studentData, error: studentError } = await supabaseAdmin
            .from('Student')
            .select('stdn_id')
            .eq('stdn_id', student_stdn_id)
            .single();

        if (studentError || !studentData) {
            return NextResponse.json({ error: `Student ${student_stdn_id} not found or error: ${studentError?.message}` }, { status: 404 });
        }

        // 1. Check Instrument Availability (using admin client to bypass RLS for this check)
        const { data: instrument, error: instrumentError } = await supabaseAdmin
            .from('Instrument')
            .select('inst_id, inst_status') // Removed inst_rentalPrice
            .eq('inst_id', instrument_id)
            .single();

        if (instrumentError || !instrument) {
            return NextResponse.json({ error: 'Instrument not found or error fetching it.' }, { status: 404 });
        }
        if (instrument.inst_status !== 'Ready') {
            return NextResponse.json({ error: `Instrument '${instrument_id}' is not available. Current status: ${instrument.inst_status}` }, { status: 409 }); // 409 Conflict
        }

        // 2. TODO: Check for overlapping bookings if this were for a room or if instruments had specific time slots
        // For instruments that are just "Ready" or "InUse", this might be simpler.
        // For rooms, you'd query Rental_Transaction for overlaps with room_id, rent_start, rent_end.

        // 3. Generate a unique transaction ID
        const trsc_id = `TRX${Date.now()}${Math.random().toString(36).substring(2, 7)}`.toUpperCase();

        // 4. Calculate total price (simplified example)
        // Set rentalPrice to a default value or fetch it from another source if needed
        const rentalPrice = 0; // Set to 0 or fetch from elsewhere if needed
        const hours = (new Date(rent_end).getTime() - new Date(rent_start).getTime()) / (1000 * 60 * 60);
        const totalPrice = rentalPrice * Math.max(1, Math.ceil(hours)); // Example: charge per hour, min 1 hour

         // 5. Get an employee NIK (randomly for this example, or assign based on logic)
        const { data: employees, error: empError } = await supabaseAdmin.from('Employee').select('empl_nik').limit(1);
        if (empError || !employees || employees.length === 0) {
            console.error("No employees found, using fallback or erroring", empError);
            return NextResponse.json({ error: 'Internal server error: Could not assign employee.' }, { status: 500 });
        }
        const employee_empl_nik = employees[0].empl_nik;


        // 6. Create Rental_Transaction record
        const { data: transactionData, error: transactionError } = await supabaseAdmin
            .from('Rental_Transaction')
            .insert({
                trsc_id,
                trsc_transactiondate: new Date().toISOString(),
                trsc_paymentmethod: payment_method,
                trsc_rentstart: new Date(rent_start).toISOString(),
                trsc_rentend: new Date(rent_end).toISOString(),
                trsc_totalprice: totalPrice,
                Student_stdn_id: student_stdn_id,
                Room_room_id: room_id, // Can be null if only instrument
                Employee_empl_nik: employee_empl_nik, // Assign a staff member
                trsc_latefee: 0, // Default
            })
            .select()
            .single();

        if (transactionError) {
            console.error('Transaction insert error:', transactionError);
            return NextResponse.json({ error: `Failed to create transaction: ${transactionError.message}` }, { status: 500 });
        }

        // 7. Create Transaction_Instrument record
        const { error: transInstError } = await supabaseAdmin
            .from('Transaction_Instrument')
            .insert({
                Transaction_trsc_id: transactionData.trsc_id,
                Instrument_inst_id: instrument_id,
            });

        if (transInstError) {
            // Rollback or log critical error - for now, just error out
            console.error('Transaction_Instrument insert error:', transInstError);
            //  Attempt to delete the transaction if this part fails
            await supabaseAdmin.from('Rental_Transaction').delete().eq('trsc_id', transactionData.trsc_id);
            return NextResponse.json({ error: `Failed to link instrument to transaction: ${transInstError.message}` }, { status: 500 });
        }

        // 8. Update Instrument status
        const { error: updateInstError } = await supabaseAdmin
            .from('Instrument')
            .update({ inst_status: 'InUse' }) // Or 'Booked'
            .eq('inst_id', instrument_id);

        if (updateInstError) {
            // Log this error, but the booking might still be considered successful
            console.error('Failed to update instrument status:', updateInstError);
        }

        // 9. Award Membership Points (if applicable)
        const { data: membership, error: membershipError } = await supabaseAdmin
            .from('Membership')
            .select('mmbr_id, mmbr_points')
            .eq('Student_stdn_id', student_stdn_id)
            .single();

        if (membership && !membershipError) {
            const pointsToAdd = Math.floor(totalPrice / 10); // Example: 1 point per $10
            const newPoints = (membership.mmbr_points || 0) + pointsToAdd;
            await supabaseAdmin
                .from('Membership')
                .update({ mmbr_points: newPoints })
                .eq('mmbr_id', membership.mmbr_id);
            console.log(`Awarded ${pointsToAdd} points to member ${membership.mmbr_id}. New total: ${newPoints}`);
        } else if (membershipError && membershipError.code !== 'PGRST116') { // PGRST116: no rows found
            console.error("Error fetching membership for points:", membershipError.message);
        }


        return NextResponse.json({ message: 'Booking successful!', transactionId: transactionData.trsc_id, transaction: transactionData }, { status: 201 });

    } catch (error: unknown) {
        console.error('API Booking Error:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}