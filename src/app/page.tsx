import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-md text-center">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to Arrowsmith</h1>
        <p className="text-gray-800">Your Next.js app with Supabase authentication</p>
        
        <div className="space-y-4">
          <Link
            href="/auth/signup"
            className="block w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
          >
            Sign Up
          </Link>
          <Link
            href="/auth/signin"
            className="block w-full rounded-md border border-indigo-600 px-4 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="block w-full rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700 transition-colors"
          >
            Dashboard (Protected)
          </Link>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Make sure to set up your <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">/.env.local</code> file with your Supabase credentials
          </p>
        </div>
      </div>
    </div>
  );
}
