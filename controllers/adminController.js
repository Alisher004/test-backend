const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const result = await db.query(
      'SELECT * FROM admins WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверные учетные данные' });
    }

    const admin = result.rows[0];

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
    const [usersResult, questionsResult, resultsResult] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM questions WHERE is_active = true'),
      db.query('SELECT COUNT(*) as count FROM results'),
    ]);

    const avgScoreResult = await db.query(
      'SELECT AVG(percentage) as avg_score FROM results WHERE percentage > 0'
    );

    const levelDistribution = await db.query(`
      SELECT color_level, COUNT(*) as count 
      FROM results 
      GROUP BY color_level
    `);

    const recentResults = await db.query(`
      SELECT r.*, u.full_name, u.phone_number 
      FROM results r
      JOIN users u ON r.user_id = u.id
      ORDER BY r.completed_at DESC 
      LIMIT 10
    `);

    res.json({
      totalUsers: parseInt(usersResult.rows[0].count),
      totalQuestions: parseInt(questionsResult.rows[0].count),
      totalTests: parseInt(resultsResult.rows[0].count),
      avgScore: Math.round(avgScoreResult.rows[0].avg_score || 0),
      levelDistribution: levelDistribution.rows,
      recentResults: recentResults.rows,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Questions Management
const getAllQuestions = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM questions ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createQuestion = async (req, res) => {
  try {
    const { level, type, question_ru, question_kg, options_ru, options_kg, correct_answer } = req.body;

    // Parse options if they are JSON strings
    let parsedOptionsRu = options_ru;
    let parsedOptionsKg = options_kg;
    
    if (typeof options_ru === 'string') {
      try {
        parsedOptionsRu = JSON.parse(options_ru);
      } catch (e) {
        parsedOptionsRu = null;
      }
    }
    
    if (typeof options_kg === 'string') {
      try {
        parsedOptionsKg = JSON.parse(options_kg);
      } catch (e) {
        parsedOptionsKg = null;
      }
    }

    // Validate based on question type
    if (type === 'logic') {
      if (!parsedOptionsRu || !parsedOptionsKg || parsedOptionsRu.length < 2 || parsedOptionsKg.length < 2) {
        return res.status(400).json({ error: 'Logic questions require at least 2 options' });
      }
    }

    // Handle image upload
    let imageFile = null;
    let imageFilename = null;
    
    if (req.file) {
      imageFile = req.file.buffer;
      imageFilename = req.file.originalname;
    }

    const result = await db.query(
      `INSERT INTO questions 
       (level, type, question_ru, question_kg, options_ru, options_kg, correct_answer, image_file, image_filename) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        level, 
        type, 
        question_ru, 
        question_kg, 
        type === 'logic' ? JSON.stringify(parsedOptionsRu) : null,
        type === 'logic' ? JSON.stringify(parsedOptionsKg) : null,
        correct_answer,
        imageFile,
        imageFilename
      ]
    );

    res.status(201).json({
      message: 'Question created successfully',
      question: result.rows[0]
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
};

const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { level, type, question_ru, question_kg, options_ru, options_kg, correct_answer } = req.body;

    // Parse options if they are JSON strings
    let parsedOptionsRu = options_ru;
    let parsedOptionsKg = options_kg;
    
    if (typeof options_ru === 'string') {
      try {
        parsedOptionsRu = JSON.parse(options_ru);
      } catch (e) {
        parsedOptionsRu = null;
      }
    }
    
    if (typeof options_kg === 'string') {
      try {
        parsedOptionsKg = JSON.parse(options_kg);
      } catch (e) {
        parsedOptionsKg = null;
      }
    }

    // Handle image upload
    let imageFile = null;
    let imageFilename = null;
    
    if (req.file) {
      imageFile = req.file.buffer;
      imageFilename = req.file.originalname;
    }

    const result = await db.query(
      `UPDATE questions 
       SET level = $1, type = $2, question_ru = $3, question_kg = $4, 
           options_ru = $5, options_kg = $6, correct_answer = $7, 
           image_file = COALESCE($8, image_file), 
           image_filename = COALESCE($9, image_filename),
           updated_at = NOW()
       WHERE id = $10 
       RETURNING *`,
      [
        level, 
        type, 
        question_ru, 
        question_kg, 
        type === 'logic' ? JSON.stringify(parsedOptionsRu) : null,
        type === 'logic' ? JSON.stringify(parsedOptionsKg) : null,
        correct_answer,
        imageFile,
        imageFilename,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      message: 'Question updated successfully',
      question: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM questions WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ 
      message: 'Question deleted successfully',
      deletedId: result.rows[0].id
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Test History
const getTestHistory = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.full_name, u.phone_number as email,
       (SELECT COUNT(*) FROM questions WHERE level = r.level AND is_active = true) as total_questions
       FROM results r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.completed_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Users Management
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, full_name, phone_number as email, age, 'user' as role, created_at 
       FROM users 
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Results Management
const getAllResults = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT r.*, u.full_name, u.phone_number as email,
       (SELECT COUNT(*) FROM questions WHERE level = r.level AND is_active = true) as total_questions
       FROM results r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.completed_at DESC`
    );

    // Process each result to include detailed answers
    const processedResults = await Promise.all(result.rows.map(async (row) => {
      let answers = [];
      
      if (row.answers && Array.isArray(row.answers)) {
        // Get question details for each answer
        const questionIds = row.answers.map(a => a.questionId);
        
        if (questionIds.length > 0) {
          const questionsResult = await db.query(
            'SELECT id, question_ru, question_kg, correct_answer FROM questions WHERE id = ANY($1)',
            [questionIds]
          );
          
          const questionsMap = {};
          questionsResult.rows.forEach(q => {
            questionsMap[q.id] = q;
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
        total_questions: answers.length,
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
    const result = await db.query(
      'SELECT * FROM test_settings ORDER BY level'
    );
    res.json(result.rows);
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

      const result = await db.query(
        `UPDATE test_settings 
         SET time_minutes = $1, updated_at = NOW()
         WHERE level = $2 
         RETURNING *`,
        [time_minutes, level]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: `Test setting for level ${level} not found` });
      }

      updatedSettings.push(result.rows[0]);
    }

    res.json({
      message: 'Test settings updated successfully',
      settings: updatedSettings
    });
  } catch (error) {
    console.error('Update test settings error:', error);
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