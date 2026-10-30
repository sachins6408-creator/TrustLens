const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to pre-computed mining results (served instantly, no Python overhead)
const CACHE_FILE = path.join(__dirname, '..', 'data_mining', 'cached_mining_results.json');

/**
 * Read cached data mining results from disk.
 * Returns the parsed JSON or null if the file does not exist / is invalid.
 */
const readCache = () => {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[Data Mining Cache]: Failed to read cache file:', e.message);
  }
  return null;
};

let cachedPythonExecutable = null;

/**
 * Resolves the Python executable to use for data mining algorithms.
 * 1. Checks process.env.PYTHON_EXECUTABLE (configurable via backend/.env)
 * 2. On Windows, tests 'py', known Python paths, 'python', 'python3'
 * 3. On Unix, tests 'python3', 'python'
 * Caches the resolved executable so all scripts use the same interpreter.
 */
const getPythonExecutable = () => {
  if (cachedPythonExecutable) {
    return cachedPythonExecutable;
  }

  // 1. Configured via environment variable
  const configured = process.env.PYTHON_EXECUTABLE && process.env.PYTHON_EXECUTABLE.trim();
  if (configured) {
    try {
      const test = spawnSync(configured, ['--version'], { encoding: 'utf-8', timeout: 4000 });
      if (test.status === 0) {
        cachedPythonExecutable = configured;
        console.log(`[Data Mining]: Using configured Python executable: "${cachedPythonExecutable}"`);
        return cachedPythonExecutable;
      } else {
        console.warn(`[Data Mining]: Configured PYTHON_EXECUTABLE "${configured}" failed check (status ${test.status}). Trying auto-detection.`);
      }
    } catch (err) {
      console.warn(`[Data Mining]: Configured PYTHON_EXECUTABLE "${configured}" could not be spawned: ${err.message}. Trying auto-detection.`);
    }
  }

  // 2. Candidate commands based on platform
  const isWindows = process.platform === 'win32';
  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : '');

  const candidates = isWindows
    ? [
        'py',
        localAppData ? path.join(localAppData, 'Python', 'pythoncore-3.14-64', 'python.exe') : null,
        localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python314', 'python.exe') : null,
        localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python312', 'python.exe') : null,
        localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python311', 'python.exe') : null,
        localAppData ? path.join(localAppData, 'Programs', 'Python', 'Python310', 'python.exe') : null,
        'python',
        'python3'
      ].filter(Boolean)
    : ['python3', 'python'];

  for (const candidate of candidates) {
    try {
      const test = spawnSync(candidate, ['-c', 'import sys; print(sys.executable)'], {
        encoding: 'utf-8',
        timeout: 4000
      });

      if (test.status === 0 && test.stdout) {
        const detectedPath = test.stdout.trim().split(/\r?\n/)[0];
        if (detectedPath && fs.existsSync(detectedPath)) {
          cachedPythonExecutable = detectedPath;
        } else {
          cachedPythonExecutable = candidate;
        }
        console.log(`[Data Mining]: Auto-detected Python executable: "${cachedPythonExecutable}"`);
        return cachedPythonExecutable;
      }
    } catch (e) {
      // Continue to next candidate
    }
  }

  // Fallback default
  cachedPythonExecutable = isWindows ? 'py' : 'python3';
  console.warn(`[Data Mining]: Auto-detection could not verify an interpreter. Falling back to default: "${cachedPythonExecutable}"`);
  return cachedPythonExecutable;
};

// Helper to execute Python data mining script
const executePythonMining = (args = []) => {
  return new Promise((resolve, reject) => {
    const pythonExec = getPythonExecutable();
    const scriptPath = path.join(__dirname, '..', 'data_mining', 'mining_service.py');

    if (!fs.existsSync(scriptPath)) {
      const scriptErr = `Data mining script not found at path: ${scriptPath}`;
      console.error('[Data Mining Error]:', scriptErr);
      return reject(new Error(scriptErr));
    }

    const pythonProcess = spawn(pythonExec, [scriptPath, ...args], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
      }
    });

    let outputData = '';
    let errorData = '';

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        const cleanErr = (errorData || '').trim() || (code === 9009
          ? `Python executable "${pythonExec}" not found (exit code 9009). Please configure PYTHON_EXECUTABLE in backend/.env.`
          : `Python data mining process failed with exit code ${code}`);
        console.error(`[Data Mining Python Error, Exit Code ${code}]:`, cleanErr);
        return reject(new Error(cleanErr));
      }

      try {
        const parsed = JSON.parse(outputData);
        resolve(parsed);
      } catch (parseErr) {
        console.error('[Data Mining JSON Parse Error]:', parseErr.message, 'Raw Output:', outputData.slice(0, 300));
        reject(new Error('Invalid JSON received from data mining service'));
      }
    });

    pythonProcess.on('error', (err) => {
      const cleanErr = err.code === 'ENOENT'
        ? `Python executable "${pythonExec}" could not be spawned (ENOENT). Please check PYTHON_EXECUTABLE in backend/.env.`
        : `Data Mining process failed to start: ${err.message}`;
      console.error('[Data Mining Spawn Error]:', cleanErr);
      reject(new Error(cleanErr));
    });
  });
};

// @desc    Get all data mining modules data (Classification, Clustering, Apriori)
// @route   GET /api/data-mining
// @access  Public / Authenticated
// Serves pre-computed cached results instantly (< 5ms) on Render free tier.
// Pass ?live=true to force a fresh Python run (admin only, slow on free tier).
const getAllDataMining = async (req, res, next) => {
  try {
    const forceLive = req.query.live === 'true';
    if (!forceLive) {
      const cached = readCache();
      if (cached) {
        console.log('[Data Mining]: Serving cached results (all modules).');
        return res.status(200).json({ ...cached, fromCache: true });
      }
    }
    console.log('[Data Mining]: Running live Python execution (all modules)...');
    const results = await executePythonMining(['all']);
    return res.status(200).json(results);
  } catch (error) {
    console.error('[Get All Data Mining Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to execute Data Mining engine: ' + error.message
    });
  }
};

// @desc    Get Classification data or re-run classifier
// @route   GET /api/data-mining/classification, POST /api/data-mining/classification/run
// @access  Public / Authenticated
const getClassification = async (req, res, next) => {
  try {
    const forceLive = req.query.live === 'true';
    if (!forceLive) {
      const cached = readCache();
      if (cached && cached.classification) {
        console.log('[Data Mining]: Serving cached classification results.');
        return res.status(200).json({ ...cached.classification, fromCache: true });
      }
    }
    const results = await executePythonMining(['classification']);
    return res.status(200).json(results);
  } catch (error) {
    console.error('[Classification Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to run Classification algorithm: ' + error.message
    });
  }
};

// @desc    Get Clustering data or re-run K-Means
// @route   GET /api/data-mining/clustering, POST /api/data-mining/clustering/run
// @access  Public / Authenticated
const getClustering = async (req, res, next) => {
  try {
    const forceLive = req.query.live === 'true';
    if (!forceLive) {
      const cached = readCache();
      if (cached && cached.clustering) {
        console.log('[Data Mining]: Serving cached clustering results.');
        return res.status(200).json({ ...cached.clustering, fromCache: true });
      }
    }
    const results = await executePythonMining(['clustering']);
    return res.status(200).json(results);
  } catch (error) {
    console.error('[Clustering Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to run Clustering algorithm: ' + error.message
    });
  }
};

// @desc    Get Apriori data or re-run Apriori with custom support/confidence
// @route   GET /api/data-mining/apriori, POST /api/data-mining/apriori/run
// @access  Public / Authenticated
const getApriori = async (req, res, next) => {
  try {
    const forceLive = req.query.live === 'true';
    if (!forceLive) {
      const cached = readCache();
      if (cached && cached.apriori) {
        console.log('[Data Mining]: Serving cached Apriori results.');
        return res.status(200).json({ ...cached.apriori, fromCache: true });
      }
    }
    const minSupport = req.body.minSupport || req.query.minSupport || '0.15';
    const minConfidence = req.body.minConfidence || req.query.minConfidence || '0.5';
    const results = await executePythonMining(['apriori', String(minSupport), String(minConfidence)]);
    return res.status(200).json(results);
  } catch (error) {
    console.error('[Apriori Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to run Apriori algorithm: ' + error.message
    });
  }
};

module.exports = {
  getAllDataMining,
  getClassification,
  getClustering,
  getApriori
};
