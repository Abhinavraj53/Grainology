import { Link } from 'react-router-dom';
import { ArrowRight, TrendingUp, Shield, Users, Truck, BarChart3, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-50 via-green-100 to-yellow-50 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                Digital Marketplace for
                <span className="text-green-600"> Agricultural Commodities</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Connect farmers, traders, and buyers on India's most trusted agri-commerce platform. 
                Trade grains, track prices, and grow your business with Grainology.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/login"
                  className="bg-green-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/about"
                  className="bg-white text-green-600 px-8 py-4 rounded-lg font-semibold border-2 border-green-600 hover:bg-green-50 transition-colors"
                >
                  Learn More
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Live Market Prices</p>
                      <p className="text-sm text-gray-600">Real-time commodity rates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg">
                    <Users className="w-8 h-8 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-gray-900">10,000+ Users</p>
                      <p className="text-sm text-gray-600">Active traders & farmers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <Truck className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-900">Logistics Support</p>
                      <p className="text-sm text-gray-600">End-to-end delivery</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Grainology?</h2>
            <p className="text-xl text-gray-600">Everything you need for successful agri-trading</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-green-50 rounded-xl hover:shadow-lg transition-shadow">
              <TrendingUp className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Real-time Market Prices</h3>
              <p className="text-gray-600">
                Access live mandi prices, market trends, and historical data to make informed trading decisions.
              </p>
            </div>
            <div className="p-8 bg-blue-50 rounded-xl hover:shadow-lg transition-shadow">
              <Shield className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Secure Transactions</h3>
              <p className="text-gray-600">
                KYC-verified users, secure payments, and quality assurance for every transaction.
              </p>
            </div>
            <div className="p-8 bg-yellow-50 rounded-xl hover:shadow-lg transition-shadow">
              <Users className="w-12 h-12 text-yellow-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Direct Connections</h3>
              <p className="text-gray-600">
                Connect directly with farmers, traders, FPOs, and corporates without intermediaries.
              </p>
            </div>
            <div className="p-8 bg-purple-50 rounded-xl hover:shadow-lg transition-shadow">
              <Truck className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Logistics Management</h3>
              <p className="text-gray-600">
                Integrated logistics support with tracking and delivery management for seamless operations.
              </p>
            </div>
            <div className="p-8 bg-orange-50 rounded-xl hover:shadow-lg transition-shadow">
              <BarChart3 className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Analytics & Reports</h3>
              <p className="text-gray-600">
                Comprehensive reports, analytics, and insights to optimize your trading strategy.
              </p>
            </div>
            <div className="p-8 bg-teal-50 rounded-xl hover:shadow-lg transition-shadow">
              <CheckCircle className="w-12 h-12 text-teal-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Quality Assurance</h3>
              <p className="text-gray-600">
                Quality parameter tracking and verification for all commodities traded on the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple steps to start trading</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Register</h3>
              <p className="text-gray-600">Create your account and complete KYC verification</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Browse</h3>
              <p className="text-gray-600">Explore offers, check prices, and find the best deals</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Trade</h3>
              <p className="text-gray-600">Place orders, negotiate prices, and finalize deals</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Deliver</h3>
              <p className="text-gray-600">Track shipments and receive quality-assured commodities</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Agri-Business?</h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of farmers and traders already trading on Grainology
          </p>
          <Link
            to="/register"
            className="inline-block bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Trading Today
          </Link>
        </div>
      </section>
    </div>
  );
}

