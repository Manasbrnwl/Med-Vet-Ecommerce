import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="text-white font-semibold text-lg mb-2">VetMedAgri</p>
          <p className="text-sm">
            Singapore's trusted source for veterinary and agricultural products.
          </p>
        </div>
        <div>
          <p className="text-white font-medium mb-2">Shop</p>
          <ul className="space-y-1 text-sm">
            <li><Link to="/shop" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link to="/shop?category=veterinary" className="hover:text-white transition-colors">Veterinary</Link></li>
            <li><Link to="/shop?category=agricultural" className="hover:text-white transition-colors">Agricultural</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-medium mb-2">Account</p>
          <ul className="space-y-1 text-sm">
            <li><Link to="/account" className="hover:text-white transition-colors">My Orders</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
            <li><Link to="/register" className="hover:text-white transition-colors">Register</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 px-4 py-4 text-center text-xs">
        &copy; {new Date().getFullYear()} VetMedAgri Pte Ltd. All rights reserved.
      </div>
    </footer>
  );
}
