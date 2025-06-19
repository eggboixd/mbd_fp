import Link from 'next/link';
import type { RentalHistoryItem as OriginalRentalHistoryItem } from '@/app/rental-history/page';

type RentalHistoryItem = OriginalRentalHistoryItem & {
  payment_status: string;
};

type Props = {
  rentals: RentalHistoryItem[];
  onPay: (transactionId: string) => Promise<void>;
};

export default function InstrumentRentalsList({ rentals, onPay }: Props) {
  if (rentals.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-xl text-gray-600 mb-4">You have no instrument rentals.</p>
        <Link href="/instruments" className="text-lg text-blue-600 hover:text-blue-800 font-semibold hover:underline">
          Rent an instrument &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {rentals.map((rental) => {
        // Correctly check the payment_status column
        const isPaid = rental.payment_status === 'Paid';
        const isLate = rental.trsc_latefee && rental.trsc_latefee > 0;

        return (
          <div key={rental.trsc_id} className={`p-6 border rounded-xl shadow-lg bg-white transition-shadow duration-300 ${isPaid && isLate ? 'border-red-400' : 'border-gray-200'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 pb-3 border-b">
              <h2 className="text-xl font-semibold text-blue-700 mb-2 sm:mb-0">Transaction ID: <span className="font-mono text-sm">{rental.trsc_id}</span></h2>
              <p className="text-sm text-gray-500"><strong>Date:</strong> {new Date(rental.trsc_transactiondate).toLocaleString()}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-gray-700 mb-4">
              <p><strong>Rent Start:</strong> {new Date(rental.trsc_rentstart).toLocaleString()}</p>
              <p><strong>Rent End:</strong> {new Date(rental.trsc_rentend).toLocaleString()}</p>
              <p><strong>Total Price:</strong> <span className="font-semibold text-gray-800">${rental.trsc_totalprice?.toString()}</span></p>
              {isPaid && rental.trsc_returndate && <p className="text-sm"><strong>Returned:</strong> {new Date(rental.trsc_returndate).toLocaleString()}</p>}
              {isLate && <p className={`font-semibold ${isPaid ? 'text-red-600' : 'text-orange-500'}`}><strong>Late Fee:</strong> ${rental.trsc_latefee?.toString()}</p>}
            </div>

            {/* Display the instrument details */}
            {rental.Transaction_Instrument.map((ti, index) => (
              <div key={`${rental.trsc_id}-${index}`} className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-800">{ti.Instrument?.inst_name || 'N/A'}</p>
                <p className="text-sm text-gray-800">{ti.Instrument?.inst_type || 'N/A'}</p>
              </div>
            ))}

            <div className="mt-4 text-right">
              {isPaid ? (
                <span className={`px-4 py-2 rounded-full font-bold text-sm ${isLate ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  Paid
                </span>
              ) : (
                <button
                  onClick={() => onPay(rental.trsc_id)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  Pay Now
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
