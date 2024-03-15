const express = require('express');
const axios = require('axios');
const record = require('node-record-lpcm16');
const fs = require('fs');
require('dotenv').config(); 

const app = express();
const port = 3000;

const openaiApiKey = process.env.OPENAI_API_KEY;

if (!openaiApiKey) {
  console.error('OpenAI API key not found. Please check your .env file.');
  process.exit(1);
}

app.get('/recognize', async (req, res) => {
  const microphoneName = req.query.microphone || 'default'; 
  const recording = record.record({
    sampleRate: 16000,
    device: microphoneName,
  });

  let partialTranscription = '';
  let responseSent = false;

  const stopRecording = () => {
    recording.stop();
    console.log('Stopping microphone recording.');
  };

  recording.stream().on('data', async (audioData) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      };

      console.log('Request Headers:', headers);

      const response = await axios.post(
        'https://api.openai.com/v1/engines/davinci-codex/completions',
        {
          prompt: 'Transcribe the following audio: ' + audioData.toString('base64'),
          max_tokens: 100,  
        },
        {
          headers,
        }
      );

      console.log('OpenAI API Response:', response.data);

      const partialResult = response.data.choices[0].text.trim();
      partialTranscription += partialResult;

    } catch (error) {
      console.error('OpenAI API Error:', error.message);

      if (!responseSent) {
        res.status(500).json({ error: 'OpenAI API Error' });
        responseSent = true;
      }
    }
  });

  req.connection.on('close', () => {
    stopRecording();
    console.log('Connection closed.');

    if (!responseSent) {
      res.json({ transcription: partialTranscription });
      responseSent = true;
    }
  });

  req.on('end', () => {
    stopRecording();
    console.log('Request ended.');

    if (!responseSent) {
      res.json({ transcription: partialTranscription });
      responseSent = true;
    }
  });
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
