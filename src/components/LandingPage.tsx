import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Gavel, ShoppingCart, FileText, Wallet, Store, 
  Cloud, Search, Handshake, TrendingUp, 
  Calendar, Building2, CheckCircle, LogIn, Truck, ChevronDown, Quote
} from 'lucide-react';
import MandiBhaav from './MandiBhaav';
import MandiSeasonWise from './MandiSeasonWise';
import LogisticsOverview from './LogisticsOverview';
import Weathersonu from './weathersonu';
import { MandiCache } from '../lib/sessionStorage';

export default function LandingPage() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const sectionRef = useRef<HTMLDivElement>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [mandiData, setMandiData] = useState<any[]>([]);

  // Load data on component mount
  useEffect(() => {
    if (isLandingPage && !hasLoaded) {
      loadMandiPreview();
      setHasLoaded(true);
    }
  }, [isLandingPage, hasLoaded]);

  const loadMandiPreview = async () => {
    try {
      // Check cache first
      const cached = MandiCache.getDefault() as any[] | null;
      if (cached && Array.isArray(cached)) {
        setMandiData(cached);
        return;
      }

      const commodities = ['Paddy', 'Maize', 'Wheat'];
      const allData: any[] = [];

      for (const commodity of commodities) {
        const params = new URLSearchParams();
        params.append('commodity_group', 'Cereals');
        params.append('commodity', commodity);
        params.append('limit', '50'); // Small limit for preview
        
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/agmarknet?${params.toString()}`,
            { signal: AbortSignal.timeout(15000) } // 15 second timeout for preview
          );

          if (response.ok) {
            const result = await response.json();
            if (result.data && result.data.length > 0) {
              allData.push(...result.data.slice(0, 1)); // Just one per commodity for preview
            }
          }
        } catch (error: any) {
          // Silently fail for preview - don't show errors
          console.warn(`Failed to load ${commodity} preview:`, error.message);
        }
      }

      setMandiData(allData);
      // Cache the data (only if we have data)
      if (allData.length > 0) {
        MandiCache.setDefault(allData);
      }
    } catch (error) {
      console.error('Error loading mandi preview:', error);
    }
  };


  return (
    <div ref={sectionRef} className="min-h-screen bg-white">
      {/* Hero Section with Enhanced Background Image */}
      <section className="relative h-[700px] flex items-center justify-center text-white overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/85 via-green-800/75 to-green-700/65"></div>
        </div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=1920&q=80')] opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center px-4">
          <div className="mb-6">
            <span className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-4 border border-white/30">
              🚀 Transforming Agriculture with Technology
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight drop-shadow-2xl">
            India's Leading
            <span className="block text-green-300">Agritech Platform</span>
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-green-50 font-medium max-w-3xl mx-auto">
            An ecosystem connecting farmers, traders, and businesses across the nation. 
            Trade smarter, grow faster, and build a sustainable agricultural future.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/register"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-bold text-lg shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-8 py-4 rounded-lg font-bold text-lg border-2 border-white/50 shadow-2xl transform hover:scale-105 transition-all duration-300"
            >
              Sign In
            </Link>
          </div>
          {/* Stats Bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-3xl font-bold mb-1">50K+</p>
              <p className="text-sm text-green-100">Active Users</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-3xl font-bold mb-1">₹500Cr+</p>
              <p className="text-sm text-green-100">Trade Volume</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-3xl font-bold mb-1">1000+</p>
              <p className="text-sm text-green-100">Cities Covered</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-3xl font-bold mb-1">24/7</p>
              <p className="text-sm text-green-100">Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Data Section - Weather, Mandi, Logistics */}
      <section className="py-16 px-4 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Real-Time Market Intelligence
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Weather Card - Using Weathersonu Component */}
            <Weathersonu />

            {/* Mandi Bhav Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Mandi Bhav</h3>
                    <p className="text-sm text-gray-600">Live Market Prices</p>
                  </div>
                </div>
              </div>
              {mandiData.length > 0 ? (
                <div className="space-y-3">
                  {mandiData.slice(0, 3).map((item: any, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-800">{item.commodity}</span>
                      <span className="text-sm font-bold text-green-600">
                        {item.dates && Object.keys(item.dates).length > 0
                          ? `₹${Math.round((Object.values(item.dates)[0] as any)?.price || 0).toLocaleString()}/qtl`
                          : 'N/A'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Loading market data...</p>
              )}
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold text-sm"
              >
                View All Prices <LogIn className="w-4 h-4" />
              </Link>
            </div>

            {/* Logistics Card - Using new component with static data */}
            <LogisticsOverview showFullDetails={false} />
          </div>

          {/* Crop Season Wise Price & Arrival Component */}
          <div className="mt-8" id="mandi-season-wise-section">
            <MandiSeasonWise />
          </div>
          
          {/* Full Mandi Bhav Component with all filters */}
          <div className="mt-8" id="mandi-bhav-section">
            <MandiBhaav />
          </div>
        </div>
      </section>

      {/* Key Offerings/Services Icons - Ultra Enhanced */}
      <section className="py-20 px-4 bg-gradient-to-br from-white via-green-50/30 to-blue-50/30 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-green-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
              ✨ Platform Features
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Everything You Need in
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                One Platform
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Comprehensive solutions for modern agriculture trading and management. 
              All your agricultural needs in one powerful platform.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {[
              { icon: Home, name: 'GrainHub', desc: 'Trading Hub', color: 'green', gradient: 'from-green-400 to-green-600' },
              { icon: Gavel, name: 'Online Auction', desc: 'Bidding Platform', color: 'blue', gradient: 'from-blue-400 to-blue-600' },
              { icon: ShoppingCart, name: 'e-Mandi', desc: 'Digital Market', color: 'purple', gradient: 'from-purple-400 to-purple-600' },
              { icon: FileText, name: 'GrainKnow', desc: 'Knowledge Base', color: 'orange', gradient: 'from-orange-400 to-orange-600' },
              { icon: Wallet, name: 'GrainPay', desc: 'Payment Gateway', color: 'teal', gradient: 'from-teal-400 to-teal-600' },
              { icon: Store, name: 'Marketplace', desc: 'Buy & Sell', color: 'indigo', gradient: 'from-indigo-400 to-indigo-600' }
            ].map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <div 
                  key={idx}
                  className="group relative"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
                  <div className="relative bg-white rounded-2xl p-6 shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 group-hover:border-transparent group-hover:-translate-y-2">
                    <div className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                      <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-800 group-hover:text-green-600 transition-colors text-center mb-1">
                      {item.name}
                    </p>
                    <p className="text-xs text-gray-500 text-center">
                      {item.desc}
                    </p>
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="h-1 w-8 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mx-auto"></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Input Marketplace Section - Enhanced with Image */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-green-400 to-blue-400 rounded-3xl blur-2xl opacity-20"></div>
              <div className="relative bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-8 shadow-2xl">
                <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xs mx-auto overflow-hidden">
                  <div className="aspect-[9/16] rounded-lg overflow-hidden">
                    <img 
                      src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&q=80" 
                      alt="Farm Inputs" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
                🛒 Input Marketplace
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Quality Farm Inputs
                <span className="block text-green-600">For Better Yields</span>
              </h2>
              <p className="text-xl text-gray-600 mb-6 leading-relaxed">
                500+ best quality farm inputs to support India grow better, faster and healthier! 
                From seeds to fertilizers, get everything you need for your farm.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/services"
                  className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg text-center"
                >
                  EXPLORE MORE →
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-green-600 border-2 border-green-600 px-8 py-4 rounded-lg font-bold hover:bg-green-50 transition-all transform hover:scale-105 shadow-lg text-center"
                >
                  BECOME A SELLER
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

      {/* Stories Section - Ultra Enhanced - Horizontal Layout */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-white to-green-50/30 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-20 right-0 w-96 h-96 bg-green-100/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-0 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
              📰 Latest Insights
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              The Grain
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                STORIES
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Stay updated with the latest trends, innovations, and insights in the agricultural sector. 
              Read about how technology is transforming farming and trading.
            </p>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              VIEW MORE
              <span className="text-xl">→</span>
            </Link>
          </div>

          {/* Horizontal Article Cards with Photos */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Traceability in Agricultural Supply Chain",
                date: "February 18, 2024",
                excerpt: "How blockchain technology is revolutionizing supply chain transparency.",
                category: "Technology",
                readTime: "5 min read",
                image: "https://images.unsplash.com/photo-1633265486064-086b219458ec?w=800&q=80"
              },
              {
                title: "Agricultural Robots: The Future of Farming",
                date: "January 31, 2024",
                excerpt: "Exploring the role of automation and robotics in modern agriculture.",
                category: "Innovation",
                readTime: "7 min read",
                image: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80"
              },
              {
                title: "Agri Finance: Empowering Farmers",
                date: "January 17, 2024",
                excerpt: "Financial solutions that are transforming the agricultural landscape.",
                category: "Finance",
                readTime: "6 min read",
                image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80"
              }
            ].map((story, idx) => (
              <div 
                key={idx} 
                className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-200 flex flex-col"
              >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={story.image} 
                    alt={story.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  {/* Category Badge on Image */}
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full backdrop-blur-sm">
                      {story.category}
                    </span>
                    <span className="px-2 py-1 bg-white/90 text-gray-600 text-xs rounded-full backdrop-blur-sm">
                      {story.readTime}
                    </span>
                  </div>
                </div>
                
                {/* Content Section */}
                <div className="p-6 relative flex-1 flex flex-col">
                  {/* Gradient Background on Hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative z-10 flex-1 flex flex-col">
                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-700 transition-colors leading-tight">
                      {story.title}
                    </h3>
                    
                    {/* Excerpt */}
                    <p className="text-gray-600 mb-4 leading-relaxed flex-1">
                      {story.excerpt}
                    </p>
                    
                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-auto">
                      <span className="text-sm text-gray-500 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {story.date}
                      </span>
                      <Link 
                        to="/about" 
                        className="text-green-600 font-semibold hover:text-green-700 flex items-center gap-1 group-hover:gap-2 transition-all"
                      >
                        READ MORE
                        <span className="text-lg">→</span>
                      </Link>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Corner Element */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100/50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Corporate Buying Section - Enhanced with Image */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-50 via-green-50/50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
                🏢 Corporate Solutions
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Looking for Corporate Buying?</h2>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700 text-lg">Create trades with custom terms</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700 text-lg">Set delivery schedules and manage orders</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700 text-lg">Multiple login access for your team</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-gray-700 text-lg">Real-time tracking and analytics</span>
                </li>
              </ul>
              <Link
                to="/contact"
                className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg"
              >
                CONTACT US
              </Link>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-green-400 to-blue-400 rounded-3xl blur-2xl opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 overflow-hidden">
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img 
                    src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80" 
                    alt="Corporate Solutions" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute bottom-6 left-6 right-6 bg-white/90 backdrop-blur-sm rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-bold text-gray-900">Enterprise Solutions</p>
                      <p className="text-sm text-gray-600">Tailored for your business needs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logistics Providers Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
              🚚 Our Logistics Partners
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Trusted Logistics
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                Providers Network
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Partnered with leading logistics providers across India for seamless delivery and transportation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Fast Logistics India",
                location: "Pan-India Coverage",
                vehicles: "500+ Vehicles",
                rating: "4.8",
                specialties: ["Express Delivery", "Cold Chain", "Bulk Transport"],
                image: "https://images.unsplash.com/photo-1601581874684-1d0e7e9f2a1a?w=800&q=80"
              },
              {
                name: "Reliable Transport Services",
                location: "North & East India",
                vehicles: "300+ Vehicles",
                rating: "4.7",
                specialties: ["Agricultural Goods", "Heavy Cargo", "Timely Delivery"],
                image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
              },
              {
                name: "Express Cargo Solutions",
                location: "South & West India",
                vehicles: "400+ Vehicles",
                rating: "4.9",
                specialties: ["Quick Delivery", "Safe Handling", "24/7 Support"],
                image: "https://images.unsplash.com/photo-1601581874684-1d0e7e9f2a1a?w=800&q=80"
              },
              {
                name: "Green Transport Network",
                location: "All Major Cities",
                vehicles: "600+ Vehicles",
                rating: "4.6",
                specialties: ["Eco-Friendly", "Cost-Effective", "Wide Coverage"],
                image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
              },
              {
                name: "Premium Logistics Hub",
                location: "Metro Cities",
                vehicles: "250+ Vehicles",
                rating: "4.9",
                specialties: ["Premium Service", "White Glove", "Priority Handling"],
                image: "https://images.unsplash.com/photo-1601581874684-1d0e7e9f2a1a?w=800&q=80"
              },
              {
                name: "Rural Connect Logistics",
                location: "Tier 2 & 3 Cities",
                vehicles: "350+ Vehicles",
                rating: "4.5",
                specialties: ["Rural Reach", "Affordable Rates", "Local Expertise"],
                image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
              }
            ].map((provider, idx) => (
              <div 
                key={idx}
                className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-green-300"
              >
                {/* Provider Image */}
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={provider.image} 
                    alt={provider.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
                  <div className="absolute top-4 right-4">
                    <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                      <span className="text-yellow-400 text-sm">★</span>
                      <span className="text-gray-900 font-bold text-sm">{provider.rating}</span>
                    </div>
                  </div>
                </div>

                {/* Provider Details */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                    {provider.name}
                  </h3>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <Truck className="w-4 h-4" />
                    <span className="text-sm">{provider.location}</span>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-600">{provider.vehicles}</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span 
                          key={star} 
                          className={`text-sm ${star <= Math.round(parseFloat(provider.rating)) ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2">
                    {provider.specialties.map((specialty, sIdx) => (
                      <span 
                        key={sIdx}
                        className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats Summary */}
          <div className="mt-12 grid md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center border-2 border-green-200">
              <div className="text-4xl font-bold text-green-600 mb-2">15+</div>
              <div className="text-gray-700 font-semibold">Logistics Partners</div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center border-2 border-blue-200">
              <div className="text-4xl font-bold text-blue-600 mb-2">2,400+</div>
              <div className="text-gray-700 font-semibold">Total Vehicles</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 text-center border-2 border-purple-200">
              <div className="text-4xl font-bold text-purple-600 mb-2">500+</div>
              <div className="text-gray-700 font-semibold">Cities Covered</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 text-center border-2 border-orange-200">
              <div className="text-4xl font-bold text-orange-600 mb-2">98%</div>
              <div className="text-gray-700 font-semibold">On-Time Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section - Enhanced */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Trusted by <span className="text-green-600">Industry Leaders</span>
            </h2>
            <p className="text-lg text-gray-600">We partner with leading organizations in agriculture and food processing</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 items-center">
            {[
              { name: 'NAFED', logo: '🌾' },
              { name: 'BRITANNIA', logo: '🍪' },
              { name: 'Adani Wilmar', logo: '🌾' },
              { name: 'KIRTI Group', logo: '🌱' },
              { name: 'Cargill', logo: '🌽' }
            ].map((partner, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-xl p-8 h-32 flex items-center justify-center shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-200 group"
              >
                <div className="text-center">
                  <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{partner.logo}</div>
                  <span className="text-gray-700 font-semibold text-sm group-hover:text-green-600 transition-colors">
                    {partner.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Insights Section - Market Stats */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Market Insights & Analytics</h2>
            <p className="text-xl text-green-100">Real-time data to make informed decisions</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl font-bold mb-2">₹2,500+</div>
              <div className="text-green-100">Avg Price per Quintal</div>
              <div className="text-sm text-green-200 mt-2">Across all commodities</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl font-bold mb-2">15%</div>
              <div className="text-green-100">Price Increase</div>
              <div className="text-sm text-green-200 mt-2">This month</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl font-bold mb-2">1.2L+</div>
              <div className="text-green-100">Active Trades</div>
              <div className="text-sm text-green-200 mt-2">Monthly transactions</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-green-100">Satisfaction Rate</div>
              <div className="text-sm text-green-200 mt-2">User satisfaction</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features/Insights Section from Features Page */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
              ✨ Platform Features
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Powerful Features for
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                Modern Agriculture
              </span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to trade efficiently and profitably
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, title: 'Real-Time Market Prices', desc: 'Get live mandi prices updated in real-time. Track price trends and make informed trading decisions.' },
              { icon: Search, title: 'Secure Transactions', desc: 'KYC-verified users, secure payment processing, and quality assurance for every transaction.' },
              { icon: Handshake, title: 'Direct Buyer-Seller Connection', desc: 'Connect directly with farmers, traders, FPOs, and corporates without intermediaries.' },
              { icon: Truck, title: 'Integrated Logistics', desc: 'End-to-end logistics support with shipment tracking and delivery management.' },
              { icon: FileText, title: 'Advanced Analytics', desc: 'Comprehensive reports, analytics, and insights to optimize your trading strategy.' },
              { icon: CheckCircle, title: 'Quality Assurance', desc: 'Quality parameter tracking and verification for all commodities traded on the platform.' },
              { icon: Cloud, title: 'Mobile-Friendly', desc: 'Access Grainology from any device. Responsive design for seamless mobile experience.' },
              { icon: Store, title: 'Multi-Language Support', desc: 'Support for multiple languages including Hindi, English, and regional languages.' }
            ].map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className="group bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-xl hover:border-green-300 transition-all duration-300 hover:-translate-y-2">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Us Preview Section with Photos - Redirects to About Page */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-green-50/30 to-blue-50/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-100/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-100/20 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
              🏢 About Us
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Empowering India's
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                Agricultural Community
              </span>
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Transforming agriculture through digital innovation and technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80" 
                  alt="Agricultural Innovation" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div>
                  <h3 className="text-white text-xl font-bold mb-2">Innovation</h3>
                  <p className="text-white/90 text-sm">Technology-driven solutions</p>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80" 
                  alt="Farmers Community" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div>
                  <h3 className="text-white text-xl font-bold mb-2">Community</h3>
                  <p className="text-white/90 text-sm">Connecting farmers & traders</p>
                </div>
              </div>
            </div>
            
            <div className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="aspect-[4/3] overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&q=80" 
                  alt="Growth & Success" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div>
                  <h3 className="text-white text-xl font-bold mb-2">Growth</h3>
                  <p className="text-white/90 text-sm">Empowering success stories</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/about"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Learn More About Us
              <span className="text-xl">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Enhanced without Photos */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 via-white to-green-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
              💬 Customer Reviews
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              What People Say About
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                GRAINOLOGY
              </span>
            </h2>
            <p className="text-lg text-gray-600">Trusted by thousands of farmers, traders, and businesses</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Grainology provides excellent market updates and helps me make informed trading decisions. The platform is user-friendly and reliable.",
                name: "Rajesh Kumar",
                role: "Trader",
                location: "Punjab"
              },
              {
                quote: "During the pandemic, Grainology made it easy to trade from home. Very convenient platform with great support team.",
                name: "Priya Sharma",
                role: "Farmer",
                location: "Bihar"
              },
              {
                quote: "The team communicates well and provides timely updates. Great service! Highly recommended for all agricultural traders.",
                name: "Amit Patel",
                role: "FPO Representative",
                location: "Gujarat"
              }
            ].map((testimonial, idx) => (
              <div 
                key={idx} 
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-green-300"
              >
                {/* Quote Icon */}
                <div className="absolute top-6 right-6 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center opacity-20 group-hover:opacity-30 transition-opacity">
                  <Quote className="w-8 h-8 text-green-600" />
                </div>
                
                <div className="relative z-10">
                  {/* Rating Stars */}
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-yellow-400 text-lg">★</span>
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <p className="text-gray-700 mb-6 leading-relaxed text-lg italic relative">
                    <span className="text-green-600 text-4xl font-bold leading-none absolute -top-2 -left-2">"</span>
                    <span className="pl-4">{testimonial.quote}</span>
                  </p>
                  
                  {/* Author Info */}
                  <div className="flex items-center gap-4 pt-6 border-t border-gray-100">
                    <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{testimonial.name}</p>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                      <p className="text-xs text-gray-500">{testimonial.location}</p>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Element */}
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-green-100/50 to-transparent rounded-tr-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section - Attractive Design */}
      <FAQSection />
    </div>
  );
}

// FAQ Component with State Management
function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "How do I register on Grainology?",
      answer: "Registration is simple! Click on 'Register' in the top navigation, fill in your details, complete the KYC verification process, and you're ready to start trading. The entire process takes just a few minutes."
    },
    {
      question: "What commodities can I trade on Grainology?",
      answer: "Currently, we support trading in Paddy, Wheat, and Maize. We're continuously expanding our commodity list to include more agricultural products. Check our platform regularly for updates on new commodities."
    },
    {
      question: "How are prices determined on the platform?",
      answer: "Prices are determined based on real-time market rates from AgMarkNet and other market sources. Our platform provides live mandi prices, and you can negotiate directly with buyers or sellers for the best rates."
    },
    {
      question: "Is my data secure on Grainology?",
      answer: "Absolutely! We use bank-level encryption and security measures to protect your data. All users undergo KYC verification, and we follow strict data privacy policies to ensure your information is safe."
    },
    {
      question: "How does quality verification work?",
      answer: "Every commodity traded on Grainology undergoes quality parameter checks. Sellers provide detailed quality parameters (moisture, foreign matter, etc.) which are verified before delivery. We ensure transparency in all quality assessments."
    },
    {
      question: "What payment methods are accepted?",
      answer: "We support multiple payment methods including bank transfers, UPI, and other secure payment gateways. Payment terms can be negotiated between buyers and sellers, with escrow services available for added security."
    },
    {
      question: "How do I track my orders?",
      answer: "Once your order is confirmed, you'll receive a tracking ID. You can monitor your shipment status in real-time through our logistics integration. All delivery updates are sent directly to your registered email and phone number."
    },
    {
      question: "Can I trade as both a buyer and seller?",
      answer: "Yes! Grainology supports multiple roles. You can register as a Farmer, Trader, FPO, Corporate, Miller, or Financer. Depending on your role, you can both buy and sell commodities on the platform."
    }
  ];

  return (
    <section className="py-20 px-4 bg-gradient-to-br from-white via-green-50/20 to-blue-50/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
            ❓ Frequently Asked Questions
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Got Questions?
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              We've Got Answers
            </span>
          </h2>
          <p className="text-lg text-gray-600">Find answers to common questions about Grainology</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between text-left group hover:bg-green-50 transition-colors"
              >
                <span className="text-lg font-bold text-gray-900 group-hover:text-green-600 transition-colors pr-4">
                  {faq.question}
                </span>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-300 ${openIndex === idx ? 'transform rotate-180' : ''}`}
                />
              </button>
              {openIndex === idx && (
                <div className="px-6 pb-5 pt-0">
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

