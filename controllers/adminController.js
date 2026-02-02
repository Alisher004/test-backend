const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const Question = require('../models/questionModel');
const Result = require('../models/resultModel');
const Admin = require('../models/adminModel');
const TestSettings = require('../models/testSettingsModel');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    // Generate token
    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Dashboard Statistics
const getDashboardStats = async (req, res) => {
  try {
    const [
      usersCount,
      questionsCount,
      resultsCount,
      avgScoreResult,
      levelDistribution,
      recentResults
    ] = await Promise.all([
      User.countDocuments(),
      Question.countDocuments({ is_active: true }),
      Result.countDocuments(),
      Result.aggregate([
        { $match: { percentage: { $gt: 0 } } },
        { $group: { _id: null, avg_score: { $avg: '$percentage' } } }
      ]),
      Result.aggregate([
        { $group: { _id: '$color_level', count: { $sum: 1 } } }
      ]),
      Result.find()
        .sort({ completed_at: -1 })
        .limit(10)
        .populate('user_id', 'full_name phone_number')
        .lean()
    ]);

    const levelDistObj = {};
    levelDistribution.forEach(item => {
      levelDistObj[item._id] = item.count;
    });

    const recentResultsFormatted = recentResults.map(r => ({
      ...r,
      user_id: undefined,
      user: r.user_id ? {
        full_name: r.user_id.full_name,
        phone_number: r.user_id.phone_number
      } : null
    }));

    res.json({
      totalUsers: usersCount,
      totalQuestions: questionsCount,
      totalTests: resultsCount,
      avgScore: Math.round(avgScoreResult[0]?.avg_score || 0),
      levelDistribution: levelDistObj,
      recentResults: recentResultsFormatted,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Questions Management
const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find()
      .sort({ created_at: -1 })
      .lean();
    res.json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createQuestion = async (req, res) => {
  try {
    const { level, type, question_ru, question_kg, options_ru, options_kg, correct_answer } = req.body;

    console.log('Received question data:', { level, type, question_ru, question_kg, correct_answer, options_ru, options_kg });

    // Parse options if they are JSON strings (only for logic type)
    let parsedOptionsRu = [];
    let parsedOptionsKg = [];
    
    if (type === 'logic' && options_ru) {
      if (typeof options_ru === 'string') {
        try {
          parsedOptionsRu = JSON.parse(options_ru);
        } catch (e) {
          console.log('Failed to parse options_ru:', options_ru);
          parsedOptionsRu = [];
        }
      } else if (Array.isArray(options_ru)) {
        parsedOptionsRu = options_ru;
      }
    }
    
    if (type === 'logic' && options_kg) {
      if (typeof options_kg === 'string') {
        try {
          parsedOptionsKg = JSON.parse(options_kg);
        } catch (e) {
          console.log('Failed to parse options_kg:', options_kg);
          parsedOptionsKg = [];
        }
      } else if (Array.isArray(options_kg)) {
        parsedOptionsKg = options_kg;
      }
    }

    // Validate based on question type - only logic questions require options
    if (type === 'logic') {
      if (parsedOptionsRu.length < 2 || parsedOptionsKg.length < 2) {
        return res.status(400).json({ error: 'Logic questions require at least 2 options in each language' });
      }
    }

    // Handle image upload
    let imageFile = null;
    let imageFilename = null;
    
    if (req.file) {
      imageFile = req.file.buffer;
      imageFilename = req.file.originalname;
    }

    const questionData = {
      level,
      type,
      question_ru,
      question_kg,
      image_file: imageFile,
      image_filename: imageFilename
    };

    // Set correct_answer - use 'N/A' for motivational questions if empty
    if (correct_answer && correct_answer.trim() !== '') {
      questionData.correct_answer = correct_answer;
    } else if (type === 'motivational' || type === 'reading') {
      questionData.correct_answer = 'N/A';
    } else {
      return res.status(400).json({ error: 'Correct answer is required' });
    }

    // Only add options for logic questions
    if (type === 'logic') {
      questionData.options_ru = parsedOptionsRu;
      questionData.options_kg = parsedOptionsKg;
    }

    const question = await Question.create(questionData);

    res.status(201).json({
      message: 'Question created successfully',
      question: question.toJSON()
    });
  } catch (error) {
    console.error('Create question error:', error);
    if (error.name === 'ValidationError') {
      console.error('Validation errors:', error.errors);
      return res.status(400).json({ error: error.message, details: error.errors });
    }
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!id || id === 'undefined' || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: 'Invalid question ID: ' + id });
    }

    const { level, type, question_ru, question_kg, options_ru, options_kg, correct_answer } = req.body;

    // Parse options if they are JSON strings
    let parsedOptionsRu = [];
    let parsedOptionsKg = [];
    
    if (options_ru) {
      if (typeof options_ru === 'string') {
        try {
          parsedOptionsRu = JSON.parse(options_ru);
        } catch (e) {
          console.log('Failed to parse options_ru:', options_ru);
          parsedOptionsRu = [];
        }
      } else if (Array.isArray(options_ru)) {
        parsedOptionsRu = options_ru;
      }
    }
    
    if (options_kg) {
      if (typeof options_kg === 'string') {
        try {
          parsedOptionsKg = JSON.parse(options_kg);
        } catch (e) {
          console.log('Failed to parse options_kg:', options_kg);
          parsedOptionsKg = [];
        }
      } else if (Array.isArray(options_kg)) {
        parsedOptionsKg = options_kg;
      }
    }

    // Handle image upload
    let updateData = {
      level,
      type,
      question_ru,
      question_kg,
      updated_at: new Date()
    };

    // Set correct_answer - use 'N/A' for motivational/reading questions if empty
    if (correct_answer && correct_answer.trim() !== '') {
      updateData.correct_answer = correct_answer;
    } else if (type === 'motivational' || type === 'reading') {
      updateData.correct_answer = 'N/A';
    }
    // For logic type, if empty, we let Mongoose validation handle it (will error if truly empty)

    if (type === 'logic') {
      updateData.options_ru = parsedOptionsRu;
      updateData.options_kg = parsedOptionsKg;
    }
    
    if (req.file) {
      updateData.image_file = req.file.buffer;
      updateData.image_filename = req.file.originalname;
    }

    const question = await Question.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      message: 'Question updated successfully',
      question: question.toJSON()
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findByIdAndDelete(id);

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ 
      message: 'Question deleted successfully',
      deletedId: id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Test History
const getTestHistory = async (req, res) => {
  try {
    const results = await Result.find()
      .sort({ completed_at: -1 })
      .populate('user_id', 'full_name phone_number')
      .lean();

    const processedResults = await Promise.all(results.map(async (row) => {
      const totalQuestions = await Question.countDocuments({ level: row.level, is_active: true });
      
      let answers = [];
      
      if (row.answers && Array.isArray(row.answers)) {
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
      
      return {
        ...row,
        user_id: undefined,
        user: row.user_id ? {
          full_name: row.user_id.full_name,
          phone_number: row.user_id.phone_number
        } : null,
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

// Users Management
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ created_at: -1 })
      .select('full_name phone_number age created_at')
      .lean();

    const formattedUsers = users.map(u => ({
      id: u._id,
      full_name: u.full_name,
      phone_number: u.phone_number,
      email: u.phone_number, // For compatibility
      age: u.age,
      role: 'user',
      created_at: u.created_at
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Results Management
const getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .sort({ completed_at: -1 })
      .populate('user_id', 'full_name phone_number')
      .lean();

    // Process each result to include detailed answers
    const processedResults = await Promise.all(results.map(async (row) => {
      let answers = [];
      
      if (row.answers && Array.isArray(row.answers)) {
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
      
      const totalQuestions = await Question.countDocuments({ level: row.level, is_active: true });
      
      return {
        ...row,
        user_id: undefined,
        user: row.user_id ? {
          full_name: row.user_id.full_name,
          phone_number: row.user_id.phone_number,
          email: row.user_id.phone_number
        } : null,
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

// Test Settings Management
const getTestSettings = async (req, res) => {
  try {
    const settings = await TestSettings.find().lean();
    res.json(settings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateTestSettings = async (req, res) => {
  try {
    const settings = req.body; // Array of settings

    if (!Array.isArray(settings)) {
      return res.status(400).json({ error: 'Settings must be an array' });
    }

    const updatedSettings = [];

    for (const setting of settings) {
      const { level, time_minutes } = setting;
      
      // Validate input
      if (!level || typeof time_minutes !== 'number' || time_minutes < 1 || time_minutes > 300) {
        return res.status(400).json({ error: `Invalid data for level ${level}: time_minutes must be a number between 1 and 300` });
      }

      const result = await TestSettings.findOneAndUpdate(
        { level },
        { time_minutes, updated_at: new Date() },
        { new: true, upsert: true, runValidators: true }
      );

      updatedSettings.push(result);
    }

    res.json({
      message: 'Test settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Update test settings error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

module.exports = {
  adminLogin,
  getDashboardStats,
  getAllQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  getTestHistory,
  getAllUsers,
  getAllResults,
  getTestSettings,
  updateTestSettings,
};

