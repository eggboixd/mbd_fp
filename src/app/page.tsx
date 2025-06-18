import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { CubeTransparentIcon, CalendarDaysIcon, MusicalNoteIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export default async function HomePage() {
  
  const { data: featuredInstruments } = await supabase
    .from('Instrument')
    .select('*')
    .eq('inst_status', 'Ready')
    .limit(3);

  const features = [
    {
      name: 'Browse Our Collection',
      description: 'Explore our wide variety of high-quality instruments and professional studio rooms.',
      icon: CubeTransparentIcon,
      href: '/instruments'
    },
    {
      name: 'Book with Ease',
      description: 'Check availability in real-time and book your desired time slot instantly through our simple interface.',
      icon: CalendarDaysIcon,
      href: '/rooms'
    },
    {
      name: 'Play and Create',
      description: 'Enjoy your rental! Create music, practice your skills, and make the most of your time.',
      icon: MusicalNoteIcon,
      href: '#'
    },
  ];

  return (
    <div className="bg-gray-50 text-gray-800">
      <section className="relative bg-gray-900 text-white text-center py-24 sm:py-32 lg:py-40">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=2070&auto=format&fit=crop')` }}
        ></div>
        <div className="relative z-10 container mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Your Sound, Your Space, Your Time.
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-300">
            High-quality instrument and studio room rentals for every musician. Find what you need and start creating today.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link href="/instruments" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300">
              Browse Instruments
            </Link>
            <Link href="/rooms" className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300">
              Explore Rooms
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Renting with us is simple and straightforward.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.name} className="text-center p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-500 text-white mx-auto mb-4">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold">{feature.name}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {featuredInstruments && featuredInstruments.length > 0 && (
        <section className="bg-gray-100 py-20 sm:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Featured Instruments</h2>
              <p className="mt-4 text-lg text-gray-600">Check out some of our available gear.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredInstruments.map((instrument) => (
                <div key={instrument.inst_id} className="border p-5 rounded-lg shadow-lg bg-white hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  {/* You would add an <Image /> component here once you have image URLs */}
                  <h3 className="text-xl font-semibold mb-2 text-blue-800">{instrument.inst_name}</h3>
                  <p className="text-gray-500 mb-4">{instrument.inst_type}</p>
                  <div className="mt-auto">
                    <Link href={`/book/instrument/${instrument.inst_id}`} className="flex items-center justify-center font-semibold text-blue-600 hover:text-blue-800">
                      View Details <ArrowRightIcon className="ml-2 h-5 w-5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-12">
                <Link href="/instruments" className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300">
                    See All Instruments
                </Link>
            </div>
          </div>
        </section>
      )}

      <section className="bg-blue-600">
        <div className="container mx-auto px-4 py-16 text-center">
            <h2 className="text-3xl font-bold text-white">Ready to Start Playing?</h2>
            <p className="mt-4 text-lg text-blue-200">Create an account to join our membership program and start booking today.</p>
            <div className="mt-8">
                <Link href="/signup" className="bg-white hover:bg-gray-200 text-blue-700 font-bold py-3 px-8 rounded-lg shadow-lg transform hover:scale-105 transition-all duration-300">
                    Sign Up Now
                </Link>
            </div>
        </div>
      </section>
    </div>
  );
}
