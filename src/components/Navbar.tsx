'use client';
import Link from 'next/link';
import { useAuth } from './AuthProvider'; // Adjust path
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const { user, studentId, signOut, isLoading } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
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
        {/* Hamburger button for mobile */}
        <button
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`block w-6 h-0.5 bg-white mb-1 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-white mb-1 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
        </button>
        {/* Menu links */}
        <div className={`space-y-2 md:space-y-0 md:space-x-4 md:flex md:items-center absolute md:static top-16 left-0 w-full md:w-auto bg-gray-800 md:bg-transparent z-50 transition-all duration-300 ${menuOpen ? 'block' : 'hidden'} md:block p-4 md:p-0`}>
          <Link href="/instruments" className="block md:inline hover:text-gray-300">Instruments</Link>
          <Link href="/rooms" className="block md:inline hover:text-gray-300">Rooms</Link>
          {user ? (
            <>
              {studentId && <Link href="/membership" className="block md:inline hover:text-gray-300">Membership</Link>}
              <Link href="/rental-history" className="block md:inline hover:text-gray-300">My Rentals</Link>
              <span className="block md:inline">Welcome, {user.email} (Student ID: {studentId || 'N/A'})</span>
              <button onClick={handleSignOut} className="block md:inline bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mt-2 md:mt-0">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block md:inline hover:text-gray-300">Login</Link>
              <Link href="/signup" className="block md:inline hover:text-gray-300">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}