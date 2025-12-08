import Footer from '../components/Footer';
import { Users, Target, Award, TrendingUp } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">About Grainology</h1>
          <p className="text-xl text-gray-600">
            Empowering India's agricultural community through digital innovation
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <div className="bg-green-50 p-8 rounded-xl">
              <Target className="w-12 h-12 text-green-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
              <p className="text-gray-600 text-lg">
                To create a transparent, efficient, and profitable digital marketplace that connects 
                farmers directly with buyers, eliminating intermediaries and ensuring fair prices 
                for agricultural commodities across India.
              </p>
            </div>
            <div className="bg-blue-50 p-8 rounded-xl">
              <TrendingUp className="w-12 h-12 text-blue-600 mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Vision</h2>
              <p className="text-gray-600 text-lg">
                To become India's most trusted agri-commerce platform, transforming how agricultural 
                commodities are traded, priced, and delivered, while empowering farmers and traders 
                with technology-driven solutions.
              </p>
            </div>
          </div>

          {/* Story */}
          <div className="mb-20">
            <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">Our Story</h2>
            <div className="max-w-4xl mx-auto space-y-6 text-lg text-gray-600">
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
              <p>
                Today, Grainology serves thousands of users across India, facilitating transparent 
                transactions and empowering the agricultural community with technology.
              </p>
            </div>
          </div>

          {/* Values */}
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <Users className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Transparency</h3>
                <p className="text-gray-600">
                  Open pricing, clear terms, and honest communication in every transaction
                </p>
              </div>
              <div className="text-center p-6">
                <Award className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Quality</h3>
                <p className="text-gray-600">
                  Rigorous quality checks and verification for all commodities
                </p>
              </div>
              <div className="text-center p-6">
                <Target className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Empowerment</h3>
                <p className="text-gray-600">
                  Empowering farmers and traders with tools and information to succeed
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

