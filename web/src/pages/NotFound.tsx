import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Page Not Found</h1>
      <p className="text-gray-500 mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="flex gap-3 justify-center">
        <Link
          to="/"
          className="bg-brand text-white px-5 py-2.5 rounded-xl font-medium hover:bg-brand-dark transition-colors"
        >
          Go Home
        </Link>
        <Link
          to="/shop"
          className="border border-brand text-brand px-5 py-2.5 rounded-xl font-medium hover:bg-brand-light transition-colors"
        >
          Browse Products
        </Link>
      </div>
    </div>
  );
}
