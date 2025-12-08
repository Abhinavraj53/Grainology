import Footer from '../components/Footer';
import { CheckCircle, TrendingUp, Shield, Users, Truck, BarChart3, Smartphone, Globe } from 'lucide-react';

export default function Features() {
  const features = [
    {
      icon: TrendingUp,
      title: 'Real-Time Market Prices',
      description: 'Get live mandi prices updated in real-time. Track price trends and make informed trading decisions.',
    },
    {
      icon: Shield,
      title: 'Secure Transactions',
      description: 'KYC-verified users, secure payment processing, and quality assurance for every transaction.',
    },
    {
      icon: Users,
      title: 'Direct Buyer-Seller Connection',
      description: 'Connect directly with farmers, traders, FPOs, and corporates without intermediaries.',
    },
    {
      icon: Truck,
      title: 'Integrated Logistics',
      description: 'End-to-end logistics support with shipment tracking and delivery management.',
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive reports, analytics, and insights to optimize your trading strategy.',
    },
    {
      icon: CheckCircle,
      title: 'Quality Assurance',
      description: 'Quality parameter tracking and verification for all commodities traded on the platform.',
    },
    {
      icon: Smartphone,
      title: 'Mobile-Friendly',
      description: 'Access Grainology from any device. Responsive design for seamless mobile experience.',
    },
    {
      icon: Globe,
      title: 'Multi-Language Support',
      description: 'Support for multiple languages including Hindi, English, and regional languages.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Platform Features</h1>
          <p className="text-xl text-gray-600">
            Powerful features designed to make agri-trading simple and profitable
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-green-300 transition-all">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Highlights */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Why Grainology Stands Out</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Transparent Pricing</h3>
              <p className="text-gray-600">
                No hidden charges. Clear pricing with real-time market rates. Know exactly what you're paying for.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Quality Guaranteed</h3>
              <p className="text-gray-600">
                Every commodity is quality-checked. Standard parameters verified before delivery.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">24/7 Support</h3>
              <p className="text-gray-600">
                Round-the-clock customer support. Get help whenever you need it.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

