import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const MinimalSpecializedPanel = () => {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">🧬 Health Protocols</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔄 Longevity (Anti-Aging)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Advanced meal planning focused on longevity and cellular health.</p>
              <ul className="mt-4 space-y-2">
                <li>• Intermittent fasting protocols</li>
                <li>• Calorie restriction options</li>
                <li>• Anti-inflammatory foods</li>
                <li>• Antioxidant-rich ingredients</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🪱 Parasite Cleanse
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>Structured protocols for digestive health and parasite elimination.</p>
              <ul className="mt-4 space-y-2">
                <li>• 7-90 day protocols</li>
                <li>• Anti-parasitic foods</li>
                <li>• Herbal supplement options</li>
                <li>• Progress tracking</li>
              </ul>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ⚠️ Full functionality coming soon. Components are being integrated.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MinimalSpecializedPanel;