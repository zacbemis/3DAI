import express, { type ErrorRequestHandler } from 'express';
import gemini, { generateText, modifyText } from './gemini/gemini';
import { writeFileSync } from 'fs';

const app = express();

// Parse JSON bodies (application/json) — required for req.body on POST
app.use(express.json());
// Optional: parse HTML forms (application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.send('Hello World');
});

app.post('/generate', async (req, res, next) => {
  try {
    const prompt = req.body?.prompt;
    if (typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({
        error: 'Missing or invalid "prompt" in JSON body',
        hint: 'Send Content-Type: application/json and a JSON object: {"prompt":"your idea here"}',
      });
      return;
    }
    const text = await generateText(prompt);
    writeFileSync('output.scad', text);
    res.type('text/plain').send(text);
  } catch (err) {
    next(err);
  }
});
app.post('/modify', async (req, res, next) => {
    try {
      const prompt = req.body?.prompt;
      const original = req.body?.original;
      if (typeof original !== 'string' || !original.trim()) {
        res.status(400).json({
          error: 'Missing or invalid "original" in JSON body',
          hint: 'Send JSON: {"original":"<existing .scad>","prompt":"what to change"}',
        });
        return;
      }
      if (typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({
          error: 'Missing or invalid "prompt" in JSON body',
          hint: 'Send Content-Type: application/json and a JSON object: {"prompt":"your idea here"}',
        });
        return;
      }
      const text = await modifyText(original, prompt);
      writeFileSync('output.scad', text);
      res.type('text/plain').send(text);
    } catch (err) {
      next(err);
    }
  });

// Invalid JSON (e.g. unquoted keys like {prompt: "x"}) fails in express.json() before the route runs
const jsonBodyErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON body',
      hint: 'Keys must be double-quoted. Valid: {"prompt":"a cube"} — not: {prompt: "a cube"}',
    });
    return;
  }
  next(err);
};

app.use(jsonBodyErrorHandler);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});