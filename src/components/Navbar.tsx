'use client';
import Link from 'next/link';
import { useAuth } from './AuthProvider'; // Adjust path
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, studentId, signOut, isLoading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/'); // Redirect to home after sign out
  };

  if (isLoading) {
    return (
      <nav className="bg-gray-800 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">Instrument Rentals</Link>
          <div>Loading...</div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">Instrument Rentals</Link>
        <div className="space-x-4">
          <Link href="/instruments" className="hover:text-gray-300">Instruments</Link>
          <Link href="/rooms" className="hover:text-gray-300">Rooms</Link>
          {user ? (
            <>
              {studentId && <Link href="/membership" className="hover:text-gray-300">Membership</Link>}
              <Link href="/rental-history" className="hover:text-gray-300">My Rentals</Link>
              <span>Welcome, {user.email} (Student ID: {studentId || 'N/A'})</span>
              <button onClick={handleSignOut} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gray-300">Login</Link>
              <Link href="/signup" className="hover:text-gray-300">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}