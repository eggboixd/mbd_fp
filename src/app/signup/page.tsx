'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
// import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stdnId, setStdnId] = useState(''); // For your custom student ID
  const [stdnName, setStdnName] = useState('');
  const [stdnTelpNum, setStdnTelpNum] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
//   const router = useRouter();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!stdnId.match(/^\d{8,10}$/)) {
         setError('Student ID must be 8 to 10 digits.');
         return;
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (authData.user) {
      // Now create the student profile
      const { error: profileError } = await supabase.from('Student').insert({
        stdn_id: stdnId,
        stdn_name: stdnName,
        stdn_telpnum: stdnTelpNum,
        auth_user_id: authData.user.id, // Link to the Supabase auth user
      });

      if (profileError) {
        setError(`Sign up successful, but failed to create profile: ${profileError.message}. Please contact support. Auth User ID: ${authData.user.id}`);
        // Consider deleting the auth user if profile creation fails critically:
        // await supabase.auth.admin.deleteUser(authData.user.id); // Requires service_role, do in API route
        return;
      }
      setMessage('Sign up successful! Please check your email to confirm your account, then log in.');
      // router.push('/login'); // Or redirect to a page asking to confirm email
    } else {
        setError('Sign up did not return a user. Please try again.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-5 text-center">Create Account</h1>
      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Student ID (8-10 digits):</label>
          <input type="text" value={stdnId} onChange={(e) => setStdnId(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Full Name:</label>
          <input type="text" value={stdnName} onChange={(e) => setStdnName(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Telephone Number:</label>
          <input type="tel" value={stdnTelpNum} onChange={(e) => setStdnTelpNum(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
        </div>
        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Sign Up
        </button>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
      </form>
      <p className="mt-4 text-center">
        Already have an account? <Link href="/login" className="text-blue-600 hover:underline">Login</Link>
      </p>
    </div>
  );
}