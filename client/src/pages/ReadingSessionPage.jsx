import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { TEXT } from '../constants/text';
import { resolveText } from '../constants/resolveText';
import FeedbackMessage from '../components/ui/FeedbackMessage';
import PageShell from '../components/ui/PageShell';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import QuestionStep from './QuestionStep';
import {
  streamReadingExercise,
  submitAnswer,
  fetchNextQuestion,
  fetchQuestion,
  skipSession,
} from '../services/readingSessionService';
import { useActiveChild } from '../context/useActiveChild';
import { ChildWorldShell, SkyOrb } from '../styles/ChildWorldStyle';
import {
  ExerciseCard,
  ExerciseContent,
  ExerciseTitle,
  SectionHeading,
  StoryCard,
  QuestionsCard,
  StoryText,
  StoryLoadingWrapper,
  LoadingBarTrack,
  LoadingBarFill,
} from '../styles/ReadingSessionPageStyle';

function isValidCanonicalQuestion(question) {
  return (
    question !== null &&
    typeof question === 'object' &&
    typeof question.id === 'string' &&
    question.id.trim().length > 0 &&
    typeof question.prompt === 'string' &&
    question.prompt.trim().length > 0
  );
}

const TEXT_OUTCOMES = ['continues', 'success', 'failure'];

function isValidEvaluationResult(result, question) {
  if (!result || typeof result !== 'object') {
    return false;
  }

  if (result.questionId !== question.id) {
    return false;
  }

  if (typeof result.isCorrect !== 'boolean') {
    return false;
  }

  if (result.feedbackType !== 'correct' && result.feedbackType !== 'retry') {
    return false;
  }

  if (result.feedbackType !== (result.isCorrect ? 'correct' : 'retry')) {
    return false;
  }

  if (!TEXT_OUTCOMES.includes(result.textOutcome)) {
    return false;
  }

  // Correct answers must finalize the text as success.
  return result.isCorrect ? result.textOutcome === 'success' : result.textOutcome !== 'success';
}

function isValidReplacementQuestion(response, exercise, question) {
  if (!response || typeof response !== 'object') {
    return false;
  }

  if (!isValidCanonicalQuestion(response.question)) {
    return false;
  }

  if (response.sessionId !== undefined && response.sessionId !== exercise.sessionId) {
    return false;
  }

  return response.question.id !== question.id;
}

function ReadingSessionPage() {
  const { activeChildId } = useActiveChild();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState(null);
  const [error, setError] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionStatus, setQuestionStatus] = useState('answering');
  const [answerCycleMessage, setAnswerCycleMessage] = useState(null);
  const [isReturningToPath, setIsReturningToPath] = useState(false);
  // Single gate for the streaming story -> reading -> fetched-question handoff.
  const [readingPhase, setReadingPhase] = useState('loadingStory');
  const isSubmittingRef = useRef(false);
  const isGeneratingRef = useRef(false);
  const isSkippingRef = useRef(false);
  const isFetchingQuestionRef = useRef(false);
  const exerciseRequestRef = useRef(null);
  const hasReturnedToPathRef = useRef(false);

  useEffect(() => {
    if (!activeChildId) {
      return undefined;
    }

    // Reuse the StrictMode duplicate request because /preview creates a session.
    // subscribe() replays streamed state to the remounted effect.
    if (exerciseRequestRef.current?.childId !== activeChildId) {
      exerciseRequestRef.current = {
        childId: activeChildId,
        stream: streamReadingExercise(activeChildId),
      };
    }

    return exerciseRequestRef.current.stream.subscribe((state) => {
      if (state.status === 'error') {
        setError(TEXT.readingSession.error);
        return;
      }

      if (state.status === 'done') {
        const { title, story, passageId, sessionId, question, grammaticalGender } = state.meta;

        setExercise({ title, story, passageId, sessionId, question, grammaticalGender });
        setCurrentQuestion(question);
        setQuestionStatus('answering');
        setAnswerText('');
        setAnswerCycleMessage(null);
        // A resumed session may already have a ready question — skip straight
        // to it rather than showing "finished reading?" for a story the child
        // may have already read in a previous visit.
        setReadingPhase(question ? 'ready' : 'reading');
        return;
      }

      // subscribe() replays the current state synchronously, even before
      // anything has actually arrived (title: null, story: '') — skip that
      // pristine case so the top-level loading state keeps showing until
      // there's genuinely something to display.
      if (state.title === null && state.story.length === 0) {
        return;
      }

      setExercise((previous) => ({ ...(previous ?? {}), title: state.title, story: state.story }));
    });
  }, [activeChildId]);

  const handleFinishedReading = useCallback(() => {
    if (readingPhase === 'loadingQuestion' || isFetchingQuestionRef.current) {
      return;
    }

    isFetchingQuestionRef.current = true;
    setReadingPhase('loadingQuestion');

    fetchQuestion(exercise.sessionId)
      .then((response) => {
        if (!isValidCanonicalQuestion(response.question)) {
          setReadingPhase('questionError');
          return;
        }

        setCurrentQuestion(response.question);
        setReadingPhase('ready');
      })
      .catch(() => {
        setReadingPhase('questionError');
      })
      .finally(() => {
        isFetchingQuestionRef.current = false;
      });
  }, [readingPhase, exercise]);

  useEffect(() => {
    if (readingPhase !== 'reading') {
      return undefined;
    }

    function handleReadingKeyDown(event) {
      if (event.key !== ' ' && event.key !== 'Enter') {
        return;
      }

      // A focused <button> already turns Enter/Space into its own click via
      // native activation — acting here too would fire handleFinishedReading
      // twice. Only step in when nothing is already handling the key itself.
      if (event.target instanceof HTMLElement && event.target.tagName === 'BUTTON') {
        return;
      }

      event.preventDefault();
      handleFinishedReading();
    }

    window.addEventListener('keydown', handleReadingKeyDown);

    return () => {
      window.removeEventListener('keydown', handleReadingKeyDown);
    };
  }, [readingPhase, handleFinishedReading]);

  const handleSubmitAnswer = () => {
    // Ref guard covers the tick before React commits questionStatus.
    if (questionStatus === 'checking' || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setQuestionStatus('checking');

    submitAnswer({ sessionId: exercise.sessionId, answerText })
      .then((result) => {
        if (!isValidEvaluationResult(result, currentQuestion)) {
          setAnswerCycleMessage(
            resolveText('readingSession.answerCycleErrorMessage', {
              grammaticalGender: exercise.grammaticalGender,
            }),
          );
          setQuestionStatus('error');
          return;
        }

        // The server owns the attempt limit; the client renders textOutcome.
        if (result.textOutcome === 'success') {
          setAnswerCycleMessage(resolveText('readingSession.correctFeedbackMessage'));
          setQuestionStatus('correct');
          return;
        }

        if (result.textOutcome === 'failure') {
          setAnswerCycleMessage(resolveText('readingSession.attemptLimitFeedbackMessage'));
          setQuestionStatus('attemptLimitReached');
          return;
        }

        setAnswerCycleMessage(
          resolveText('readingSession.retryFeedbackMessage', {
            grammaticalGender: exercise.grammaticalGender,
          }),
        );
        setQuestionStatus('retry');
      })
      .catch(() => {
        setAnswerCycleMessage(
          resolveText('readingSession.answerCycleErrorMessage', {
            grammaticalGender: exercise.grammaticalGender,
          }),
        );
        setQuestionStatus('error');
      })
      .finally(() => {
        isSubmittingRef.current = false;
      });
  };

  const handleRequestReplacementQuestion = () => {
    if (questionStatus === 'generating' || isGeneratingRef.current) {
      return;
    }

    isGeneratingRef.current = true;
    setQuestionStatus('generating');

    fetchNextQuestion(exercise.sessionId)
      .then((response) => {
        if (!isValidReplacementQuestion(response, exercise, currentQuestion)) {
          setAnswerCycleMessage(
            resolveText('readingSession.answerCycleErrorMessage', {
              grammaticalGender: exercise.grammaticalGender,
            }),
          );
          setQuestionStatus('error');
          return;
        }

        setCurrentQuestion(response.question);
        setAnswerText('');
        setAnswerCycleMessage(null);
        setQuestionStatus('answering');
      })
      .catch(() => {
        setAnswerCycleMessage(
          resolveText('readingSession.answerCycleErrorMessage', {
            grammaticalGender: exercise.grammaticalGender,
          }),
        );
        setQuestionStatus('error');
      })
      .finally(() => {
        isGeneratingRef.current = false;
      });
  };

  const handleSkip = () => {
    // Ref guard covers the tick before React commits questionStatus.
    if (questionStatus === 'skipping' || isSkippingRef.current) {
      return;
    }

    isSkippingRef.current = true;
    setQuestionStatus('skipping');

    skipSession(exercise.sessionId)
      .then(() => {
        setAnswerCycleMessage(resolveText('readingSession.skippedFeedbackMessage'));
        setQuestionStatus('skipped');
      })
      .catch(() => {
        setAnswerCycleMessage(
          resolveText('readingSession.answerCycleErrorMessage', {
            grammaticalGender: exercise.grammaticalGender,
          }),
        );
        setQuestionStatus('error');
      })
      .finally(() => {
        isSkippingRef.current = false;
      });
  };

  const handleReturnToPath = () => {
    // navigate() does not unmount synchronously.
    if (hasReturnedToPathRef.current) {
      return;
    }

    hasReturnedToPathRef.current = true;
    setIsReturningToPath(true);

    navigate('/child-home');
  };

  if (!activeChildId) {
    return <Navigate to="/children" replace />;
  }

  if (error) {
    return (
      <PageShell>
        <Card>
          <FeedbackMessage tone="error">{error}</FeedbackMessage>
        </Card>
      </PageShell>
    );
  }

  if (!exercise) {
    return (
      <ChildWorldShell>
        <SkyOrb $top="6%" $left="8%" $size={90} $tone="accentLight" $duration="24s" />
        <SkyOrb $top="16%" $right="10%" $size={64} $tone="primaryLight" $duration="20s" $delay="-4s" />
        <SkyOrb $top="2%" $right="34%" $size={48} $tone="secondaryLight" $duration="28s" $delay="-9s" />

        <StoryLoadingWrapper role="status" aria-label={TEXT.readingSession.loading}>
          <LoadingBarTrack>
            <LoadingBarFill />
          </LoadingBarTrack>
        </StoryLoadingWrapper>
      </ChildWorldShell>
    );
  }

  return (
    <ChildWorldShell>
      <SkyOrb $top="6%" $left="8%" $size={90} $tone="accentLight" $duration="24s" />
      <SkyOrb $top="16%" $right="10%" $size={64} $tone="primaryLight" $duration="20s" $delay="-4s" />
      <SkyOrb $top="2%" $right="34%" $size={48} $tone="secondaryLight" $duration="28s" $delay="-9s" />

      <ExerciseCard
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      >
        <ExerciseContent>
          <ExerciseTitle>{exercise.title}</ExerciseTitle>

          <StoryCard>
            <SectionHeading>{TEXT.readingSession.storyLabel}</SectionHeading>
            <StoryText>{exercise.story}</StoryText>
          </StoryCard>

          <QuestionsCard>
            <SectionHeading>{TEXT.readingSession.questionsLabel}</SectionHeading>
            {readingPhase === 'reading' && (
              <Button onClick={handleFinishedReading}>
                {resolveText('readingSession.finishedReadingButtonLabel')}
              </Button>
            )}
            {readingPhase === 'loadingQuestion' && (
              <FeedbackMessage tone="info">
                {resolveText('readingSession.loadingQuestionMessage')}
              </FeedbackMessage>
            )}
            {readingPhase === 'questionError' && (
              <>
                <FeedbackMessage tone="error">
                  {resolveText('readingSession.questionErrorMessage', {
                    grammaticalGender: exercise.grammaticalGender,
                  })}
                </FeedbackMessage>
                <Button onClick={handleFinishedReading}>
                  {resolveText('readingSession.retryFinishedReadingButtonLabel')}
                </Button>
              </>
            )}
            {readingPhase === 'ready' && (isValidCanonicalQuestion(currentQuestion) ? (
              <QuestionStep
                question={currentQuestion}
                answerText={answerText}
                onAnswerChange={(e) => setAnswerText(e.target.value)}
                onSubmit={handleSubmitAnswer}
                status={questionStatus}
                placeholder={resolveText('readingSession.answerInputPlaceholder', {
                  grammaticalGender: exercise.grammaticalGender,
                })}
                ariaLabel={resolveText('readingSession.answerInputAriaLabel')}
                submitLabel={resolveText('readingSession.submitAnswerButtonLabel')}
                checkingLabel={resolveText('readingSession.checkingLabel')}
                feedbackMessage={answerCycleMessage}
                onRequestReplacement={handleRequestReplacementQuestion}
                replacementActionLabel={resolveText('readingSession.requestNextQuestionButtonLabel')}
                generatingLabel={resolveText('readingSession.generatingNextQuestionLabel')}
                onReturnToPath={handleReturnToPath}
                returnToPathLabel={resolveText('readingSession.returnToPathButtonLabel')}
                isReturningToPath={isReturningToPath}
                onSkip={handleSkip}
                skipLabel={resolveText('readingSession.skipButtonLabel')}
                skippingLabel={resolveText('readingSession.skippingLabel')}
              />
            ) : (
              <FeedbackMessage tone="error">
                {resolveText('readingSession.noMoreQuestionsFallbackMessage', {
                  grammaticalGender: exercise.grammaticalGender,
                })}
              </FeedbackMessage>
            ))}
          </QuestionsCard>
        </ExerciseContent>
      </ExerciseCard>
    </ChildWorldShell>
  );
}

export default ReadingSessionPage;
