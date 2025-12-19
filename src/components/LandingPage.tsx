import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Gavel, ShoppingCart, FileText, Wallet, Store, 
  Cloud, Search, Handshake, TrendingUp, Play, 
  Calendar, Building2, CheckCircle, Truck, LogIn
} from 'lucide-react';
import MandiBhaav from './MandiBhaav';
import { WeatherCache, MandiCache } from '../lib/sessionStorage';
import { useIsVisible } from '../hooks/useIsVisible';

export default function LandingPage() {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const sectionRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(sectionRef);
  const [hasLoaded, setHasLoaded] = useState(false);

  const [weather, setWeather] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [mandiData, setMandiData] = useState<any[]>([]);
  const [logisticsStats, setLogisticsStats] = useState({
    activeShipments: 0,
    completedShipments: 0,
    totalProviders: 0
  });

  // Only load data if this is the active route and component is visible
  useEffect(() => {
    if (isLandingPage && (isVisible || !hasLoaded)) {
      if (!hasLoaded) {
        loadWeather();
        loadMandiPreview();
        loadLogisticsStats();
        setHasLoaded(true);
      }
    }
  }, [isLandingPage, isVisible, hasLoaded]);

  const loadWeather = async () => {
    try {
      setWeatherLoading(true);
      const location = 'Patna';
      const state = 'Bihar';

      // Check cache first
      const cached = WeatherCache.get(location, state);
      if (cached) {
        setWeather(cached);
        setWeatherLoading(false);
        return;
      }

      // Fetch from API
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const params = new URLSearchParams({
        location,
        state,
      });

      const response = await fetch(`${baseUrl}/weather/current?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          setWeather(data);
          // Cache the data
          WeatherCache.set(location, state, data);
        }
      }
    } catch (error) {
      console.error('Error loading weather:', error);
    } finally {
      setWeatherLoading(false);
    }
  };

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
        
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/mandi/agmarknet?${params.toString()}`
        );

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            allData.push(...result.data.slice(0, 1)); // Just one per commodity for preview
          }
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

  const loadLogisticsStats = async () => {
    try {
      // For public display, we'll show sample stats or fetch from a public endpoint
      // Since logistics requires auth, we'll show placeholder stats with a call to action
      setLogisticsStats({
        activeShipments: 0,
        completedShipments: 0,
        totalProviders: 0
      });
    } catch (error) {
      console.error('Error loading logistics stats:', error);
    }
  };

  return (
    <div ref={sectionRef} className="min-h-screen bg-white">
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

      {/* Live Data Section - Weather, Mandi, Logistics */}
      <section className="py-16 px-4 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Real-Time Market Intelligence
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Weather Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Cloud className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Weather Forecast</h3>
                    <p className="text-sm text-gray-600">Patna, Bihar</p>
                  </div>
                </div>
              </div>
              {weatherLoading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : weather ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-4xl font-bold text-gray-900">
                      {Math.round((weather.temperature_min + weather.temperature_max) / 2)}°C
                    </span>
                    <span className="text-sm text-gray-600">{weather.weather_condition}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Humidity:</span>
                      <span className="font-semibold ml-2">{Math.round(weather.humidity || 0)}%</span>
                    </div>
                    {weather.rainfall > 0 && (
                      <div>
                        <span className="text-gray-600">Rainfall:</span>
                        <span className="font-semibold ml-2">{weather.rainfall} mm</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Weather data loading...</p>
              )}
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
              >
                View Full Forecast <LogIn className="w-4 h-4" />
              </Link>
            </div>

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

            {/* Logistics Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Truck className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Logistics</h3>
                    <p className="text-sm text-gray-600">Track Your Shipments</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Active Shipments</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {logisticsStats.activeShipments > 0 ? logisticsStats.activeShipments : '--'}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Completed Today</p>
                  <p className="text-2xl font-bold text-green-600">
                    {logisticsStats.completedShipments > 0 ? logisticsStats.completedShipments : '--'}
                  </p>
                </div>
              </div>
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold text-sm"
              >
                Track Your Orders <LogIn className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Full Mandi Bhav Component with all filters */}
          <div className="mt-8">
            <MandiBhaav />
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
