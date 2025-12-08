import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Sprout, ArrowRight } from 'lucide-react';
import AuthPage from '../components/AuthPage';

export default function Register() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-green-100 to-yellow-50">
      <Navigation />
      <div className="py-8">
        <AuthPage />
      </div>
      <Footer />
    </div>
  );
}

