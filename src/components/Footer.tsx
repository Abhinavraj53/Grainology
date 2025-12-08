import { Link } from 'react-router-dom';
import { Sprout, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Sprout className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-white">Grainology</span>
            </Link>
            <p className="text-gray-400 mb-4">
              India's trusted digital marketplace for agricultural commodities. 
              Connecting farmers, traders, and buyers.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="hover:text-green-500 transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-green-500 transition-colors">About Us</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Services</Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-green-500 transition-colors">Features</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-green-500 transition-colors">Contact</Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Commodity Trading</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Market Prices</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Logistics</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Quality Assurance</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Analytics</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-500 mt-1" />
                <span>support@grainology.com</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-green-500 mt-1" />
                <span>+91 1800-XXX-XXXX</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-500 mt-1" />
                <span>India</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Grainology. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

