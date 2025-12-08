import Footer from '../components/Footer';
import { TrendingUp, Shield, Truck, BarChart3, Users, CheckCircle } from 'lucide-react';

export default function Services() {
  const services = [
    {
      icon: TrendingUp,
      title: 'Commodity Trading Platform',
      description: 'Buy and sell agricultural commodities including Paddy, Wheat, Maize, and more. Direct connections between farmers and buyers.',
      features: ['Real-time pricing', 'Quality verification', 'Secure transactions']
    },
    {
      icon: BarChart3,
      title: 'Market Intelligence',
      description: 'Access live mandi prices, market trends, historical data, and price forecasts to make informed trading decisions.',
      features: ['Live prices', 'Market trends', 'Price forecasts']
    },
    {
      icon: Shield,
      title: 'KYC & Verification',
      description: 'Comprehensive KYC verification for all users using PAN, Aadhaar, GST, and CIN. Ensures secure and trusted transactions.',
      features: ['Document verification', 'Identity validation', 'Business verification']
    },
    {
      icon: Truck,
      title: 'Logistics Management',
      description: 'End-to-end logistics support with shipment tracking, delivery management, and logistics provider network.',
      features: ['Shipment tracking', 'Delivery management', 'Provider network']
    },
    {
      icon: CheckCircle,
      title: 'Quality Assurance',
      description: 'Quality parameter tracking and verification for all commodities. Standard quality checks and reporting.',
      features: ['Quality checks', 'Parameter tracking', 'Quality reports']
    },
    {
      icon: Users,
      title: 'Multi-Role Platform',
      description: 'Support for Farmers, Traders, FPOs, Corporates, Millers, and Financers. Role-specific features and dashboards.',
      features: ['Role-based access', 'Custom dashboards', 'Specialized features']
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">Our Services</h1>
          <p className="text-xl text-gray-600">
            Comprehensive solutions for all your agricultural trading needs
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => {
              const Icon = service.icon;
              return (
                <div key={index} className="bg-white border-2 border-gray-100 rounded-xl p-8 hover:shadow-lg hover:border-green-200 transition-all">
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-600 mb-6">{service.description}</p>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-600">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of users already benefiting from our services
          </p>
          <a
            href="/login"
            className="inline-block bg-white text-green-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Start Using Services
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}

