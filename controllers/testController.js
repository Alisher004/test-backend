const Question = require('../models/questionModel');
const Result = require('../models/resultModel');
const TestSettings = require('../models/testSettingsModel');

const getQuestions = async (req, res) => {
  try {
    const { level } = req.params;
    const lang = req.query.lang || 'ru';

    // Get test time from settings
    const settings = await TestSettings.findOne({ level });
    const timeMinutes = settings?.time_minutes || 20;

    // Get all active questions for this level
    const questions = await Question.find({ level, is_active: true })
      .select('level type question_ru question_kg options_ru options_kg image_file image_filename')
      .lean();

    const processedQuestions = questions.map(q => {
      const { correct_answer, ...question } = q;
      
      // Map language fields
      if (lang === 'kg') {
        question.question = q.question_kg;
        question.options = q.options_kg;
      } else {
        question.question = q.question_ru;
        question.options = q.options_ru;
      }
      
      // Add image URL if image exists
      if (q.image_file) {
        question.image_url = `/api/questions/${q._id}/image`;
        question.image_filename = q.image_filename;
      } else {
        question.image_url = null;
      }
      
      delete question.question_ru;
      delete question.question_kg;
      delete question.options_ru;
      delete question.options_kg;
      delete question.image_file;
      
      return question;
    });

    res.json({ questions: processedQuestions, timeMinutes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const submitTest = async (req, res) => {
  try {
    const { userId, level, answers, startTime } = req.body;

    // Get test time from settings
    const settings = await TestSettings.findOne({ level });
    const testTime = settings?.time_minutes || 20;

    // Check if time expired
    const currentTime = Date.now();
    const elapsed = (currentTime - startTime) / 1000 / 60; // minutes
    if (elapsed > testTime) {
      return res.status(400).json({ error: 'Время теста истекло' });
    }

    // Check if test already taken for this level
    const existingResult = await Result.findOne({ user_id: userId, level });
    if (existingResult) {
      return res.status(400).json({ error: 'Тест уже пройден для этого уровня' });
    }

    // Get all questions for this level
    const questions = await Question.find({ level, is_active: true }).lean();
    const questionsMap = {};
    questions.forEach(q => {
      questionsMap[q._id.toString()] = q;
    });

    const totalQuestions = questions.length;
    let correctCount = 0;
    let scoredQuestions = 0; // Only count logic/reading questions for scoring
    
    answers.forEach(answer => {
      const question = questionsMap[answer.questionId];
      if (question) {
        // Skip motivational questions in scoring (they don't have a correct answer)
        if (question.type === 'motivational') {
          return; // Skip this answer
        }
        scoredQuestions++;
        if (answer.answer === question.correct_answer) {
          correctCount++;
        }
      }
    });

    // Calculate percentage based on scored questions only
    const percentage = scoredQuestions > 0 
      ? Math.round((correctCount / scoredQuestions) * 100) 
      : 0;

    let colorLevel = '';
    if (percentage <= 40) colorLevel = 'weak';
    else if (percentage <= 70) colorLevel = 'medium';
    else colorLevel = 'high';

    const result = await Result.create({
      user_id: userId,
      level,
      score: correctCount,
      percentage,
      color_level: colorLevel,
      answers: answers.map(a => ({
        questionId: a.questionId,
        answer: a.answer
      })),
      completed_at: new Date()
    });

    res.json({
      message: 'Test submitted successfully',
      result: {
        score: correctCount,
        percentage,
        colorLevel,
        totalQuestions: totalQuestions,
        correctAnswers: correctCount,
        testTime: testTime
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getResults = async (req, res) => {
  try {
    const { userId } = req.params;

    const results = await Result.find({ user_id: userId })
      .sort({ completed_at: -1 })
      .lean();

    // Process each result to include detailed answers
    const processedResults = await Promise.all(results.map(async (row) => {
      let answers = [];

      if (row.answers && Array.isArray(row.answers)) {
        // Get question details for each answer
        const questionIds = row.answers.map(a => a.questionId);

        if (questionIds.length > 0) {
          const questions = await Question.find({ _id: { $in: questionIds } }).lean();

          const questionsMap = {};
          questions.forEach(q => {
            questionsMap[q._id.toString()] = q;
          });

          answers = row.answers.map(answer => {
            const question = questionsMap[answer.questionId];
            return {
              question_id: answer.questionId,
              question_text_ru: question ? question.question_ru : 'Вопрос не найден',
              question_text_kg: question ? question.question_kg : 'Суроо табылган жок',
              given_answer: answer.answer,
              correct_answer: question ? question.correct_answer : 'N/A'
            };
          });
        }
      }

      // Get total questions for this level
      const totalQuestions = await Question.countDocuments({ level: row.level, is_active: true });

      return {
        ...row,
        total_questions: answers.length || totalQuestions,
        answers
      };
    }));

    res.json(processedResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getTestSettings = async (req, res) => {
  try {
    const settings = await TestSettings.find().lean();
    
    // Transform to expected format
    const settingsObj = {};
    for (const row of settings) {
      const totalQuestions = await Question.countDocuments({ level: row.level, is_active: true });
      settingsObj[row.level] = {
        questions: totalQuestions,
        time: row.time_minutes
      };
    }
    
    res.json(settingsObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getQuestions, submitTest, getResults, getTestSettings };

