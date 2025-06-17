import Link from "next/link";
import { 
  UserPlusIcon, 
  ArrowRightOnRectangleIcon, 
  ChartBarIcon,
  SparklesIcon 
} from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="flex flex-col items-center gap-6">
        <img src="/images/shakespear.jpg" alt="Shakes Pear" className="h-40 w-40 rounded" />

        <div className="w-full w-md space-y-6 rounded-lg bg-white p-8 shadow-md text-center">
          <p className="text-2xl text-gray-800">Shakes Pear</p>
          
          <div className="space-y-4">
            <Link
              href="/auth/signup"
              className="flex items-center justify-center space-x-2 w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 transition-colors"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span>Sign Up</span>
            </Link>
            <Link
              href="/auth/signin"
              className="flex items-center justify-center space-x-2 w-full rounded-md border border-indigo-600 px-4 py-2 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
