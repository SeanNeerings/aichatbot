const express = require('express');
const { SpeechClient } = require('@google-cloud/speech');
const record = require('node-record-lpcm16');
const fs = require('fs');

const app = express();
const port = 3000;

const speechClient = new SpeechClient({
  projectId: 'aichatbot-416813',
  keyFilename: '../../keys/aichatbot-416813-0cf8c17dfe75.json',
});

app.get('/recognize', (req, res) => {
  const microphoneName = req.query.microphone || 'default'; 
  const recording = record.record({
    sampleRate: 16000,
    device: microphoneName,
  });

  const recognizeStream = speechClient
    .streamingRecognize({
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US',
      },
    })
    .on('error', console.error)
    .on('data', data => {
      const transcription = data.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      console.log('Transcription:', transcription);
      res.json({ transcription });
    });

  recording.stream().pipe(recognizeStream);

  req.connection.on('close', () => {
    recording.stop();
    console.log('Connection closed. Stopping microphone recording.');
  });
});

const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed. Stopping microphone recording.');
    process.exit(0);
  });
});
