import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HelpCircle, Send, Lightbulb } from 'lucide-react';

export default function ClarificationDialog({ isOpen, onClose, clarificationData, onSubmitAnswer }) {
  const [answers, setAnswers] = useState({});

  if (!clarificationData) return null;

  const { reason, questions, suggestions } = clarificationData;

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers({
      ...answers,
      [questionIndex]: value,
    });
  };

  const handleSubmit = () => {
    // Combine all answers into a context object
    const context = {
      previous_question: questions.map((q) => q.question).join('; '),
      user_answer: Object.values(answers).join('; '),
      answers_detail: questions.map((q, idx) => ({
        question: q.question,
        answer: answers[idx],
      })),
    };

    onSubmitAnswer(context);
  };

  const allQuestionsAnswered = questions.every((_, idx) => answers[idx] !== undefined && answers[idx] !== '');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            We Need More Information
          </DialogTitle>
          <DialogDescription>
            Your command needs clarification to ensure we do exactly what you want.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason for clarification */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-800">
              <span className="font-semibold">Why we're asking:</span> {reason}
            </AlertDescription>
          </Alert>

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="space-y-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <Label className="text-sm font-medium text-slate-900">
                  {index + 1}. {question.question}
                </Label>

                {question.type === 'choice' && question.options ? (
                  <RadioGroup
                    value={answers[index] || ''}
                    onValueChange={(value) => handleAnswerChange(index, value)}
                  >
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`q${index}-opt${optionIndex}`} />
                        <Label
                          htmlFor={`q${index}-opt${optionIndex}`}
                          className="font-normal cursor-pointer"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : question.type === 'number' ? (
                  <Input
                    type="number"
                    placeholder="Enter a number..."
                    value={answers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                  />
                ) : (
                  <Input
                    type="text"
                    placeholder="Enter your answer..."
                    value={answers[index] || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-purple-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-purple-900 mb-1">Suggestions:</p>
                  <ul className="text-xs text-purple-700 space-y-1">
                    {suggestions.map((suggestion, idx) => (
                      <li key={idx}>• {suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Answers
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
