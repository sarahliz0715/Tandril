import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

export default function SellerCard() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <style>{`
        /* Hide print area on screen */
        .print-only {
          display: none;
        }
        
        @media print {
          /* Hide everything on screen */
          .screen-only {
            display: none !important;
          }
          
          /* Show only print content */
          .print-only {
            display: block !important;
          }
          
          /* Reset body */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Each card on its own page */
          .print-card {
            page-break-after: always;
            page-break-inside: avoid;
            display: flex !important;
            justify-content: center;
            align-items: center;
            width: 3.5in;
            height: 2in;
            margin: 0 auto;
          }
          
          .print-card:last-child {
            page-break-after: auto;
          }
          
          .print-card > div {
            width: 3.5in;
            height: 2in;
          }
        }
        
        @page {
          size: 3.5in 2in;
          margin: 0;
        }
      `}</style>

      {/* Screen Preview */}
      <div className="screen-only min-h-screen bg-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Tandril Seller Card</h1>
              <p className="text-slate-600">Print these cards to share with sellers at your booth</p>
            </div>
            <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700">
              <Printer className="w-4 h-4 mr-2" />
              Print Cards
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div 
                className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg shadow-xl overflow-hidden"
                style={{ width: '3.5in', height: '2in', padding: '0.3in' }}
              >
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <h2 className="text-xl font-bold text-slate-900 mb-4 leading-tight">
                    Running your booth is the fun part!
                  </h2>
                  <p className="text-base font-bold text-slate-700 leading-snug">
                    Love selling your products but wish selling online wasn't such a pain in the a$$?
                  </p>
                </div>
              </div>
              <p className="text-center text-sm text-slate-500 mt-2">Front</p>
            </div>

            <div>
              <div 
                className="bg-white rounded-lg shadow-xl overflow-hidden border-2 border-green-200"
                style={{ width: '3.5in', height: '2in', padding: '0.25in' }}
              >
                <div className="flex h-full">
                  <div className="flex items-center justify-center" style={{ width: '35%' }}>
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a3236e6b961b3c35fd1bbc/95e41c0a7_tandril_google_form_qr.png"
                      alt="Survey QR Code"
                      className="w-28 h-28"
                    />
                  </div>
                  
                  <div className="flex flex-col justify-center" style={{ width: '65%', paddingLeft: '0.15in' }}>
                    <h3 className="text-base font-bold text-slate-900 mb-2">
                      Tandril
                    </h3>
                    <p className="text-xs text-slate-700 mb-2 leading-snug">
                      We're building tools to make online selling <span className="font-semibold">way easier</span> — less uploading, listing, and juggling marketplaces.
                    </p>
                    <p className="text-xs text-green-700 font-bold mb-2">
                      Let's make online selling not suck — together.
                    </p>
                    <p className="text-xs text-slate-600">
                      📱 Scan or visit <span className="font-semibold">tandril.com/survey</span>
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-center text-sm text-slate-500 mt-2">Back</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Printing Instructions:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click "Print Cards" button above</li>
              <li>• Set paper size to 3.5" x 2" (standard business card)</li>
              <li>• Or print on standard paper and cut to size</li>
              <li>• Use cardstock (80lb+) for best results</li>
              <li>• Print double-sided if your printer supports it</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Print-Only Area */}
      <div className="print-only">
        {/* FRONT CARD */}
        <div className="print-card">
          <div 
            className="bg-gradient-to-br from-green-50 to-emerald-100"
            style={{ padding: '0.3in', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '16px', lineHeight: '1.2' }}>
              Running your booth is the fun part!
            </h2>
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#334155', lineHeight: '1.4' }}>
              Love selling your products but wish selling online wasn't such a pain in the a$$?
            </p>
          </div>
        </div>

        {/* BACK CARD */}
        <div className="print-card">
          <div 
            className="bg-white"
            style={{ padding: '0.25in', border: '2px solid #bbf7d0', display: 'flex' }}
          >
            <div style={{ width: '35%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68a3236e6b961b3c35fd1bbc/95e41c0a7_tandril_google_form_qr.png"
                alt="Survey QR Code"
                style={{ width: '112px', height: '112px' }}
              />
            </div>
            
            <div style={{ width: '65%', paddingLeft: '0.15in', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                Tandril
              </h3>
              <p style={{ fontSize: '12px', color: '#334155', marginBottom: '8px', lineHeight: '1.4' }}>
                We're building tools to make online selling <span style={{ fontWeight: '600' }}>way easier</span> — less uploading, listing, and juggling marketplaces.
              </p>
              <p style={{ fontSize: '12px', color: '#15803d', fontWeight: 'bold', marginBottom: '8px' }}>
                Let's make online selling not suck — together.
              </p>
              <p style={{ fontSize: '12px', color: '#475569' }}>
                📱 Scan or visit <span style={{ fontWeight: '600' }}>tandril.com/survey</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}