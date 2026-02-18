import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { GenerateImage } from '@/lib/integrations';
import { Sparkles, Loader2, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function SmartAdGenerator({ onImageGenerated }) {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.warning("Please enter a description for the image you want to create.");
            return;
        }
        setIsLoading(true);
        setGeneratedImageUrl(null);
        try {
            const result = await GenerateImage({ prompt });
            if (result && result.url) {
                setGeneratedImageUrl(result.url);
                toast.success("Image generated successfully!");
            } else {
                throw new Error("Invalid response from image generation service.");
            }
        } catch (error) {
            console.error("Failed to generate image:", error);
            toast.error("Image generation failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleUseImage = () => {
        if (generatedImageUrl && onImageGenerated) {
            onImageGenerated(generatedImageUrl);
        }
    };

    return (
        <Card className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-purple-200 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    AI Ad Creative Studio
                </CardTitle>
                <CardDescription>
                    Describe the ad visual you want, and let AI bring it to life. Perfect for new campaigns or product mockups.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Input Section */}
                    <div className="space-y-4">
                        <Textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A vibrant, photorealistic image of a person wearing a blue t-shirt on a sunny beach, professional studio lighting"
                            className="min-h-[100px] bg-white"
                            disabled={isLoading}
                        />
                        <Button onClick={handleGenerate} disabled={isLoading} className="w-full bg-purple-600 hover:bg-purple-700">
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Image
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Output Section */}
                    <div className="flex items-center justify-center bg-white/50 rounded-lg border border-dashed border-slate-300 min-h-[200px] p-4">
                        {isLoading ? (
                            <div className="text-center text-slate-500">
                                <Loader2 className="w-8 h-8 mx-auto animate-spin mb-2" />
                                <p>Conjuring pixels...</p>
                            </div>
                        ) : generatedImageUrl ? (
                            <div className="w-full space-y-4">
                                <img src={generatedImageUrl} alt="AI Generated Ad Creative" className="rounded-lg object-cover w-full aspect-square" />
                                <div className="flex gap-2">
                                    <Button onClick={handleUseImage} className="flex-1">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Use for New Ad
                                    </Button>
                                    <a href={generatedImageUrl} target="_blank" rel="noopener noreferrer" download>
                                        <Button variant="outline" size="icon">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-slate-500">
                                <Sparkles className="w-8 h-8 mx-auto mb-2" />
                                <p>Your generated image will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}