'use client';

import { usePremium } from '@/contexts/PremiumContext';

export default function PaywallModal() {
  const { showPaywall, setShowPaywall, upgradeToPremium } = usePremium();

  if (!showPaywall) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 999999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 text-center text-white">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Upgrade to Pro</h2>
          <p className="text-indigo-100 text-sm">Unlock powerful features</p>
        </div>

        {/* Features */}
        <div className="p-6">
          <div className="space-y-4 mb-6">
            <Feature
              icon="✉️"
              title="Send for Signature"
              description="Email PDFs to others for their signature"
            />
            <Feature
              icon="📸"
              title="Scan & Create PDFs"
              description="Create PDFs from your camera or photos"
            />
            <Feature
              icon="☁️"
              title="Cloud Storage"
              description="Save and sync documents across devices"
            />
            <Feature
              icon="📋"
              title="Template Library"
              description="Access pre-made forms and contracts"
            />
            <Feature
              icon="🎨"
              title="Custom Branding"
              description="Add your logo and remove watermarks"
            />
          </div>

          {/* Pricing */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
            <div className="text-3xl font-bold text-gray-900">$9.99<span className="text-lg font-normal text-gray-600">/month</span></div>
            <p className="text-xs text-gray-500 mt-1">Cancel anytime • 7-day free trial</p>
          </div>

          {/* CTA Buttons */}
          <button
            onClick={upgradeToPremium}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl mb-3"
          >
            Start Free Trial
          </button>
          <button
            onClick={() => setShowPaywall(false)}
            className="w-full py-3 text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            Maybe Later
          </button>

          <p className="text-xs text-center text-gray-400 mt-4">
            Subscriptions are managed through the App Store
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 text-lg">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    </div>
  );
}
