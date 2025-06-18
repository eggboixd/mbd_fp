import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Initialize the admin client to bypass RLS for secure server-side operations
const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { transactionId } = await req.json();

        if (!transactionId) {
            return NextResponse.json({ error: 'Transaction ID is required.' }, { status: 400 });
        }

        // This is the core of the "dummy payment"
        // We set the return date to now() which will automatically trigger
        // your database function to calculate the late fee.
        // We also update the payment status.
        const { data: updatedTransaction, error: updateError } = await supabaseAdmin
            .from('Rental_Transaction')
            .update({
                payment_status: 'Paid',
                trsc_returndate: new Date().toISOString() // Simulate return at the time of payment
            })
            .eq('trsc_id', transactionId)
            .select() // Select the updated row to send back to the client
            .single();

        if (updateError) {
            console.error('Error marking transaction as paid:', updateError);
            return NextResponse.json({ error: `Failed to update transaction: ${updateError.message}` }, { status: 500 });
        }

        // Return the full, updated transaction data so the UI can update instantly
        return NextResponse.json(updatedTransaction);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
        console.error('API Mark as Paid Error:', errorMessage);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
