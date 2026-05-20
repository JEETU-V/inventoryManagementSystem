import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-600 mb-4">404 - Page Not Found</h1>
        <p className="text-gray-600 mb-6">The page you’re looking for doesn’t exist or you may need to sign in.</p>
        <Link
          to="/"
          className="inline-block rounded-full bg-blue-600 px-5 py-3 text-white font-semibold hover:bg-blue-700 transition"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;