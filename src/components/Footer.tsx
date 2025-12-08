import { Link } from 'react-router-dom';
import { Sprout, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Youtube } from 'lucide-react';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Subscribe:', email);
    setEmail('');
    alert('Thank you for subscribing!');
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-5 gap-8 mb-8">
          {/* Company Info */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Sprout className="w-8 h-8 text-green-500" />
              <span className="text-2xl font-bold text-white">Grainology</span>
            </Link>
            <p className="text-gray-400 mb-4">
              India's leading agritech platform connecting agricultural community across the nation. 
              Empowering farmers, traders, and buyers with digital solutions.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-green-500 transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">QUICK LINKS</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="hover:text-green-500 transition-colors">About Grainology</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Our Services</Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-green-500 transition-colors">Insights</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-green-500 transition-colors">Contact Us</Link>
              </li>
              <li>
                <a href="#" className="hover:text-green-500 transition-colors">FAQs</a>
              </li>
              <li>
                <a href="#" className="hover:text-green-500 transition-colors">Terms of Use</a>
              </li>
            </ul>
          </div>

          {/* Agri Insights */}
          <div>
            <h3 className="text-white font-semibold mb-4">AGRI INSIGHTS</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/features" className="hover:text-green-500 transition-colors">Blog</Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-green-500 transition-colors">Grain Stories</Link>
              </li>
              <li>
                <Link to="/features" className="hover:text-green-500 transition-colors">Market Insights</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-green-500 transition-colors">Commodity Reports</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">CONNECT WITH US</h3>
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

        {/* Newsletter Signup */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="max-w-md mx-auto text-center">
            <h3 className="text-white font-semibold mb-4">Sign up for our newsletter</h3>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>

        {/* Security Certifications & Copyright */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-gray-400 text-sm">
                &copy; {new Date().getFullYear()} Grainology. All rights reserved.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-gray-800 px-4 py-2 rounded text-sm">SSL Secured</div>
              <div className="bg-gray-800 px-4 py-2 rounded text-sm">ISO Certified</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
