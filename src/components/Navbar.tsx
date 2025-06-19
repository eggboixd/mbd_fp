'use client';
import Link from 'next/link';
import { useAuth } from './AuthProvider';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserIcon } from '@heroicons/react/24/solid';

export default function Navbar() {
  const { user, profile, signOut, isLoading } = useAuth(); // Use `profile` instead of `studentId`
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setMenuOpen(false); // Close menu on sign out
    await signOut();
    router.push('/');
  };

  // Close menu when a link is clicked
  const handleLinkClick = () => {
    setMenuOpen(false);
  };

  if (isLoading) {
    // A simple loading state for the navbar
    return <div className="bg-gray-800 text-white p-4 h-[68px]"></div>;
  }

  return (
    <nav className="bg-gray-800 text-white p-4 sticky top-0 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-gray-300 transition-colors" onClick={handleLinkClick}>
          ITS Music
        </Link>

        {/* Hamburger button for mobile, shown only on smaller screens */}
        <div className="md:hidden">
            <button
              className="flex flex-col justify-center items-center w-8 h-8 focus:outline-none"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              <span className={`block w-6 h-0.5 bg-white mb-1 transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-white mb-1 transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-6 h-0.5 bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </button>
        </div>

        {/* --- MENU LINKS --- */}
        {/* This div handles both mobile dropdown and desktop layout */}
        <div className={`absolute md:static top-[68px] left-0 w-full md:w-auto bg-gray-800 md:bg-transparent z-40 transition-transform duration-300 ease-in-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="container mx-auto flex flex-col md:flex-row md:items-center md:justify-between p-4 md:p-0 space-y-4 md:space-y-0 md:space-x-6">
              {/* Main Navigation Links */}
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
                <Link href="/instruments" className="hover:text-gray-300" onClick={handleLinkClick}>Instruments</Link>
                <Link href="/rooms" className="hover:text-gray-300" onClick={handleLinkClick}>Rooms</Link>
                {user && <Link href="/rental-history" className="hover:text-gray-300" onClick={handleLinkClick}>My Rentals</Link>}
              </div>

              {/* User Authentication Links / Profile Section */}
              <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 border-t border-gray-700 md:border-none pt-4 md:pt-0">
                  {user ? (
                      <>
                        <span className="text-gray-400">
                          Welcome, {profile?.stdn_name || user.email}
                        </span>
                        <div className="flex items-center space-x-6">
                            <Link href="/profile" className="hover:text-gray-300" title="My Profile" onClick={handleLinkClick}>
                                <UserIcon className="h-7 w-7" />
                            </Link>
                            <button onClick={handleSignOut} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                                Sign Out
                            </button>
                        </div>
                      </>
                  ) : (
                      <>
                        <Link href="/login" className="hover:text-gray-300" onClick={handleLinkClick}>Login</Link>
                        <Link href="/signup" className="hover:text-gray-300" onClick={handleLinkClick}>Sign Up</Link>
                      </>
                  )}
              </div>
          </div>
        </div>
      </div>
    </nav>
  );
}