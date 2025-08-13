import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function QuizPlayer({ quiz, onComplete }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);

  const handleAnswerSelect = (question, answer) => {
    setSelectedAnswers({ ...selectedAnswers, [question]: answer });
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, index) => {
      if (selectedAnswers[q.question] === q.correct_answer) {
        correct++;
      }
    });
    return (correct / quiz.questions.length) * 100;
  };

  const handleFinish = () => {
    // Here you would save the QuizAttempt to the database
    logger.log("Quiz finished, score:", calculateScore());
    setShowResults(true);
  };

  if (showResults) {
    const score = calculateScore();
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-lg text-secondary mb-4">You scored:</p>
          <p className="text-5xl font-bold text-accent-green mb-6">
            {score.toFixed(0)}%
          </p>
          <Button onClick={() => onComplete(score)}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = quiz.questions[currentQuestionIndex];

  return (
    <Card className="glass-effect">
      <CardHeader>
        <CardTitle>{quiz.title}</CardTitle>
        <p className="text-secondary">
          Question {currentQuestionIndex + 1} of {quiz.questions.length}
        </p>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold text-primary mb-4">
          {currentQuestion.question}
        </p>
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option) => (
            <Button
              key={option}
              variant={
                selectedAnswers[currentQuestion.question] === option
                  ? "default"
                  : "outline"
              }
              className={`w-full justify-start text-left h-auto py-3 ${
                selectedAnswers[currentQuestion.question] === option
                  ? "bg-accent-green"
                  : "bg-surface"
              }`}
              onClick={() =>
                handleAnswerSelect(currentQuestion.question, option)
              }
            >
              {option}
            </Button>
          ))}
        </div>
        <div className="flex justify-between">
          {currentQuestionIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            >
              Previous
            </Button>
          )}
          {currentQuestionIndex < quiz.questions.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
            >
              Next
            </Button>
          ) : (
            <Button className="bg-accent-green" onClick={handleFinish}>
              Finish Quiz
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
