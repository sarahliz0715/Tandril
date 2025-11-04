import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import TandrilLogo from '../components/logos/TandrilLogo';

export default function Survey() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    product_category: '',
    selling_platforms: '',
    biggest_challenge: '',
    weekly_hours: '',
    current_tools: '',
    wish_existed: '',
    tech_comfort: '',
    quit_platform: '',
    automation_value: '',
    early_access_interest: '',
    contact_email: '',
    additional_comments: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit via backend function (works without auth)
      const response = await fetch('/api/functions/submitSurvey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Submission failed');
      }
      
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (error) {
      console.error('Survey submission error:', error);
      toast.error("Oops! Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-12 pb-12">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Thank You! 🎉</h2>
            <p className="text-slate-600 mb-6">
              Your feedback helps us build tools that actually solve real problems for sellers like you.
            </p>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-indigo-800">
                Want to stay in the loop? We'll share updates as we build Tandril based on your feedback.
              </p>
            </div>
            <Button 
              onClick={() => window.location.href = 'https://tandril.com'}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Learn More About Tandril
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TandrilLogo className="h-12 w-12" />
            <h1 className="text-3xl font-bold text-slate-900">Tandril</h1>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Help Us Build Better Tools for Sellers</h2>
          <p className="text-slate-600">Quick 10-question survey • 100% anonymous</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                Seller Pain Point Survey
              </CardTitle>
              <CardDescription>10 quick questions • 100% anonymous unless you share your email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question 1 */}
              <div className="space-y-2">
                <Label htmlFor="product_category" className="text-base font-semibold">
                  1. What's your main product or category?
                </Label>
                <Input
                  id="product_category"
                  value={formData.product_category}
                  onChange={(e) => handleChange('product_category', e.target.value)}
                  placeholder="e.g., handmade jewelry, art prints, plants..."
                  required
                />
              </div>

              {/* Question 2 */}
              <div className="space-y-2">
                <Label htmlFor="selling_platforms" className="text-base font-semibold">
                  2. Where do you currently sell online (if anywhere)?
                </Label>
                <Input
                  id="selling_platforms"
                  value={formData.selling_platforms}
                  onChange={(e) => handleChange('selling_platforms', e.target.value)}
                  placeholder="e.g., Etsy, Shopify, Instagram, local markets..."
                  required
                />
              </div>

              {/* Question 3 */}
              <div className="space-y-2">
                <Label htmlFor="biggest_challenge" className="text-base font-semibold">
                  3. What's the hardest part about selling online right now?
                </Label>
                <Textarea
                  id="biggest_challenge"
                  value={formData.biggest_challenge}
                  onChange={(e) => handleChange('biggest_challenge', e.target.value)}
                  placeholder="Tell us what frustrates you most..."
                  rows={3}
                  required
                />
              </div>

              {/* Question 4 */}
              <div className="space-y-2">
                <Label htmlFor="weekly_hours" className="text-base font-semibold">
                  4. How much time do you spend updating listings or managing inventory online each week?
                </Label>
                <Input
                  id="weekly_hours"
                  value={formData.weekly_hours}
                  onChange={(e) => handleChange('weekly_hours', e.target.value)}
                  placeholder="e.g., 5-10 hours, too many..."
                />
              </div>

              {/* Question 5 */}
              <div className="space-y-2">
                <Label htmlFor="current_tools" className="text-base font-semibold">
                  5. Do you use any tools or apps to help with your online sales?
                </Label>
                <Input
                  id="current_tools"
                  value={formData.current_tools}
                  onChange={(e) => handleChange('current_tools', e.target.value)}
                  placeholder="List any tools, or write 'none'"
                />
              </div>

              {/* Question 6 */}
              <div className="space-y-2">
                <Label htmlFor="wish_existed" className="text-base font-semibold">
                  6. What's one thing you wish existed to make selling online easier?
                </Label>
                <Textarea
                  id="wish_existed"
                  value={formData.wish_existed}
                  onChange={(e) => handleChange('wish_existed', e.target.value)}
                  placeholder="Dream feature or tool..."
                  rows={3}
                />
              </div>

              {/* Question 7 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  7. How comfortable are you with tech tools or automation?
                </Label>
                <RadioGroup value={formData.tech_comfort} onValueChange={(value) => handleChange('tech_comfort', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_at_all" id="tech1" />
                    <Label htmlFor="tech1" className="font-normal cursor-pointer">Not at all comfortable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="a_little" id="tech2" />
                    <Label htmlFor="tech2" className="font-normal cursor-pointer">A little comfortable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="somewhat" id="tech3" />
                    <Label htmlFor="tech3" className="font-normal cursor-pointer">Somewhat comfortable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="pretty_comfortable" id="tech4" />
                    <Label htmlFor="tech4" className="font-normal cursor-pointer">Pretty comfortable</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="very_comfortable" id="tech5" />
                    <Label htmlFor="tech5" className="font-normal cursor-pointer">Very comfortable</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 8 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  8. Have you ever quit or avoided an online platform because it was too complicated?
                </Label>
                <RadioGroup value={formData.quit_platform} onValueChange={(value) => handleChange('quit_platform', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="quit1" />
                    <Label htmlFor="quit1" className="font-normal cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="quit2" />
                    <Label htmlFor="quit2" className="font-normal cursor-pointer">No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="considered_it" id="quit3" />
                    <Label htmlFor="quit3" className="font-normal cursor-pointer">Considered it</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Question 9 */}
              <div className="space-y-2">
                <Label htmlFor="automation_value" className="text-base font-semibold">
                  9. If an app could handle your online store updates automatically, what would that be worth to you?
                </Label>
                <p className="text-sm text-slate-500">Time, money, sanity – tell us what it's worth!</p>
                <Textarea
                  id="automation_value"
                  value={formData.automation_value}
                  onChange={(e) => handleChange('automation_value', e.target.value)}
                  placeholder="Your answer..."
                  rows={2}
                />
              </div>

              {/* Question 10 */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  10. Would you be open to trying early access tools like Tandril to simplify online selling?
                </Label>
                <RadioGroup value={formData.early_access_interest} onValueChange={(value) => handleChange('early_access_interest', value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="early1" />
                    <Label htmlFor="early1" className="font-normal cursor-pointer">Yes, I'd try it!</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maybe" id="early2" />
                    <Label htmlFor="early2" className="font-normal cursor-pointer">Maybe, tell me more</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="early3" />
                    <Label htmlFor="early3" className="font-normal cursor-pointer">Not right now</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Optional Email */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="contact_email" className="text-base font-semibold">
                  Want updates? (Optional)
                </Label>
                <p className="text-sm text-slate-500">We'll only email you about Tandril progress – no spam ever.</p>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="your@email.com"
                />
              </div>

              {/* Additional Comments */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="additional_comments" className="text-base font-semibold">
                  Anything else you'd like to share?
                </Label>
                <p className="text-sm text-slate-500">Any other thoughts, frustrations, or ideas – we're all ears!</p>
                <Textarea
                  id="additional_comments"
                  value={formData.additional_comments}
                  onChange={(e) => handleChange('additional_comments', e.target.value)}
                  placeholder="Your additional comments..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            type="submit" 
            size="lg" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-lg h-12"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Survey'}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-4">
          This survey is 100% anonymous unless you choose to share your email. We're building Tandril to solve real problems for sellers like you.
        </p>
      </div>
    </div>
  );
}