import { Link } from 'react-router-dom';
import { 
  Home, Gavel, ShoppingCart, FileText, Wallet, Store, 
  Cloud, Search, Handshake, TrendingUp, Play, 
  Calendar, Users, Building2, CheckCircle
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background Image */}
      <section className="relative h-[600px] flex items-center justify-center text-white">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/80 to-green-700/60"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            India's Leading Agritech Platform
          </h1>
          <p className="text-xl md:text-2xl mb-8">
            An ecosystem connecting agricultural community across the nation
          </p>
          {/* Carousel Indicators */}
          <div className="flex justify-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full"></div>
            <div className="w-3 h-3 bg-white/50 rounded-full"></div>
            <div className="w-3 h-3 bg-white/50 rounded-full"></div>
            <div className="w-3 h-3 bg-white/50 rounded-full"></div>
            <div className="w-3 h-3 bg-white/50 rounded-full"></div>
            <div className="w-3 h-3 bg-white/50 rounded-full"></div>
          </div>
        </div>
      </section>

      {/* Key Offerings/Services Icons */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Home className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">GrainHub</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Gavel className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Online Auction</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">e-Mandi</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FileText className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">GrainKnow</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">GrainPay</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Store className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-700">Marketplace</p>
            </div>
          </div>
        </div>
      </section>

      {/* Input Marketplace Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-8">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xs mx-auto">
                  <div className="aspect-[9/16] bg-gray-100 rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-16 h-16 text-green-600" />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Input Marketplace</h2>
              <p className="text-xl text-gray-600 mb-6">
                500+ best quality farm inputs to support India grow better, faster and healthier!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/services"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center"
                >
                  EXPLORE MORE
                </Link>
                <Link
                  to="/register"
                  className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-center"
                >
                  LOGIN AS SELLER
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Services Section */}
      <section className="py-20 px-4 relative bg-green-600 text-white">
        <div 
          className="absolute inset-0 opacity-10 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=1920&q=80)',
          }}
        ></div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid md:grid-cols-5 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <Cloud className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-3">IoT Based Farm Management</h3>
              <p className="text-green-100 mb-4">Smart farming solutions with IoT sensors and monitoring systems.</p>
              <Link to="/services" className="text-white font-semibold hover:underline">READ MORE →</Link>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <Search className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-3">Crop Assessment using AI, ML, GIS</h3>
              <p className="text-green-100 mb-4">Advanced analytics for crop health and yield prediction.</p>
              <Link to="/services" className="text-white font-semibold hover:underline">READ MORE →</Link>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <Handshake className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-3">Intelligent goods & settlement services</h3>
              <p className="text-green-100 mb-4">Automated settlement and goods management systems.</p>
              <Link to="/services" className="text-white font-semibold hover:underline">READ MORE →</Link>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <ShoppingCart className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-3">Input & Output marketplace</h3>
              <p className="text-green-100 mb-4">Complete marketplace for agricultural inputs and outputs.</p>
              <Link to="/services" className="text-white font-semibold hover:underline">READ MORE →</Link>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors">
              <Wallet className="w-12 h-12 mb-4" />
              <h3 className="text-xl font-bold mb-3">Agri fintech services</h3>
              <p className="text-green-100 mb-4">Financial services tailored for agricultural community.</p>
              <Link to="/services" className="text-white font-semibold hover:underline">READ MORE →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">
            What People Say About GRAINOLOGY
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Grainology provides excellent market updates and helps me make informed trading decisions.",
                name: "Rajesh Kumar",
                role: "Trader"
              },
              {
                quote: "During the pandemic, Grainology made it easy to trade from home. Very convenient platform.",
                name: "Priya Sharma",
                role: "Farmer"
              },
              {
                quote: "The team communicates well and provides timely updates. Great service!",
                name: "Amit Patel",
                role: "FPO Representative"
              }
            ].map((testimonial, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-6">
                <div className="aspect-video bg-green-100 rounded-lg mb-4 flex items-center justify-center relative group cursor-pointer">
                  <Play className="w-16 h-16 text-green-600 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stories Section */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">The Grain STORIES</h2>
              <p className="text-lg text-gray-600 mb-6">
                Stay updated with the latest trends, innovations, and insights in the agricultural sector. 
                Read about how technology is transforming farming and trading.
              </p>
              <Link
                to="/features"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                VIEW MORE
              </Link>
            </div>
            <div className="space-y-6">
              {[
                {
                  title: "Traceability in Agricultural Supply Chain",
                  date: "February 18, 2024",
                  excerpt: "How blockchain technology is revolutionizing supply chain transparency."
                },
                {
                  title: "Agricultural Robots: The Future of Farming",
                  date: "January 31, 2024",
                  excerpt: "Exploring the role of automation and robotics in modern agriculture."
                },
                {
                  title: "Agri Finance: Empowering Farmers",
                  date: "January 17, 2024",
                  excerpt: "Financial solutions that are transforming the agricultural landscape."
                }
              ].map((story, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{story.title}</h3>
                  <p className="text-gray-600 mb-3">{story.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {story.date}
                    </span>
                    <Link to="/features" className="text-green-600 font-semibold hover:underline">
                      READ MORE →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Buying Section */}
      <section className="py-20 px-4 bg-green-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">Looking for Corporate Buying?</h2>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-gray-700">Create trades with custom terms</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-gray-700">Set delivery schedules and manage orders</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-gray-700">Multiple login access for your team</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-gray-700">Real-time tracking and analytics</span>
                </li>
              </ul>
              <Link
                to="/contact"
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                CONTACT US
              </Link>
            </div>
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="bg-gray-100 rounded-lg p-8 aspect-video flex items-center justify-center">
                <Building2 className="w-24 h-24 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 text-center mb-12">Meet Our Partners</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-center">
            {['NAFED', 'BRITANNIA', 'Adani Wilmar', 'KIRTI Group', 'Cargill'].map((partner, idx) => (
              <div key={idx} className="bg-gray-100 rounded-lg p-8 h-32 flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-center">{partner}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
