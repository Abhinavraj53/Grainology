import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { Users, Target, Award, TrendingUp, Shield, CheckCircle, Globe, Heart, Zap, BarChart3 } from 'lucide-react';
// import Weathersonu from '../components/weathersonu';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - Enhanced */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-500 to-blue-600 py-24 px-4 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=1920&q=80')] opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/60 to-blue-900/60"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-6 border border-white/30">
            🚀 About Grainology
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            Empowering India's
            <span className="block text-green-200">Agricultural Community</span>
          </h1>
          <p className="text-xl md:text-2xl text-green-50 leading-relaxed">
            Transforming agriculture through digital innovation and technology-driven solutions
          </p>
        </div>
      </section>
      {/* <Weathersonu /> */}

      {/* Mission & Vision - Enhanced */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            <div className="group relative bg-gradient-to-br from-green-50 to-green-100 p-10 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-green-200">
              <div className="absolute top-6 right-6 w-20 h-20 bg-green-200/50 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Mission</h2>
                <p className="text-gray-700 text-lg leading-relaxed">
                  To create a transparent, efficient, and profitable digital marketplace that connects 
                  farmers directly with buyers, eliminating intermediaries and ensuring fair prices 
                  for agricultural commodities across India.
                </p>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-blue-50 to-blue-100 p-10 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-blue-200">
              <div className="absolute top-6 right-6 w-20 h-20 bg-blue-200/50 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Vision</h2>
                <p className="text-gray-700 text-lg leading-relaxed">
                  To become India's most trusted agri-commerce platform, transforming how agricultural 
                  commodities are traded, priced, and delivered, while empowering farmers and traders 
                  with technology-driven solutions.
                </p>
              </div>
            </div>
          </div>

          {/* Story Section - Enhanced with Images */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
                📖 Our Story
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                How We Started
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-green-400 to-blue-400 rounded-3xl blur-2xl opacity-20"></div>
                <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=800&q=80" 
                    alt="Our Journey" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-6 text-lg text-gray-700 leading-relaxed">
                <p>
                  Grainology was born from the vision of revolutionizing India's agricultural trading 
                  ecosystem. We recognized the challenges faced by farmers and traders: lack of price 
                  transparency, dependency on middlemen, and limited access to quality markets.
                </p>
                <p>
                  Our platform bridges these gaps by providing a digital marketplace where farmers can 
                  directly connect with traders, FPOs, corporates, and other buyers. With real-time 
                  market prices, quality assurance, and integrated logistics, we're making agri-trading 
                  more efficient and profitable for everyone.
                </p>
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl p-8 border-2 border-green-200">
                <p className="text-lg text-gray-700 leading-relaxed text-center">
                  Today, Grainology serves <span className="font-bold text-green-600">thousands of users</span> across India, 
                  facilitating transparent transactions and empowering the agricultural community with technology.
                </p>
              </div>
            </div>
          </div>

          {/* Values - Enhanced */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-block px-4 py-2 bg-green-100 rounded-full text-sm font-semibold text-green-700 mb-4">
                💎 Our Values
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
                What We Stand For
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-green-300">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Transparency</h3>
                <p className="text-gray-600 leading-relaxed">
                  Open pricing, clear terms, and honest communication in every transaction
                </p>
              </div>
              <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-blue-300">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Quality</h3>
                <p className="text-gray-600 leading-relaxed">
                  Rigorous quality checks and verification for all commodities
                </p>
              </div>
              <div className="group text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-yellow-300">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Empowerment</h3>
                <p className="text-gray-600 leading-relaxed">
                  Empowering farmers and traders with tools and information to succeed
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-green-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Why Choose <span className="text-green-600">Grainology</span>
            </h2>
            <p className="text-lg text-gray-600">Key differentiators that set us apart</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: 'Secure Platform', desc: 'Bank-level security for all transactions' },
              { icon: CheckCircle, title: 'Quality Guaranteed', desc: 'Every commodity verified before delivery' },
              { icon: Zap, title: 'Fast Processing', desc: 'Quick order processing and delivery' },
              { icon: BarChart3, title: 'Real-Time Data', desc: 'Live market prices and analytics' },
              { icon: Globe, title: 'Pan-India Coverage', desc: 'Serving farmers across all states' },
              { icon: Heart, title: 'Farmer First', desc: 'Designed with farmers in mind' },
              { icon: Users, title: '24/7 Support', desc: 'Round-the-clock customer assistance' },
              { icon: TrendingUp, title: 'Growing Network', desc: 'Expanding reach every day' }
            ].map((feature, idx) => {
              const IconComponent = feature.icon;
              return (
                <div key={idx} className="group bg-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-green-300">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Our Impact</h2>
            <p className="text-xl text-green-100">Numbers that speak for themselves</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
              <div className="text-5xl font-bold mb-2">50K+</div>
              <div className="text-green-100">Active Users</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
              <div className="text-5xl font-bold mb-2">₹500Cr+</div>
              <div className="text-green-100">Trade Volume</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
              <div className="text-5xl font-bold mb-2">1000+</div>
              <div className="text-green-100">Cities Covered</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 text-center">
              <div className="text-5xl font-bold mb-2">98%</div>
              <div className="text-green-100">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6">
            Ready to Transform Your
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
              Agricultural Trading?
            </span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of farmers and traders already using Grainology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-4 rounded-xl font-bold hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-105 shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              to="/contact"
              className="bg-white text-green-600 border-2 border-green-600 px-8 py-4 rounded-xl font-bold hover:bg-green-50 transition-all transform hover:scale-105 shadow-lg"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
