import React, { useState, ChangeEvent, useCallback, useEffect } from 'react';
import { 
  Container, Typography, TextField, Button, Card, CardContent, CardActions, 
  List, ListItem, ListItemText, Paper, Grid, CircularProgress, Alert
} from '@mui/material';
import { Mic, Send, Stop, PlayArrow } from '@mui/icons-material';
import { Settings, TokenStatus, Message, DialogueParams } from './types/types';
import { checkChatGPTToken, generateResponse } from './services/chatGPTService';
import { startSpeechRecognition, speakText, calculateSimilarity, findMostSimilarResponse, speakDialogue } from './services/speechService';


const DialogueApp: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    chatGPTToken: '',
    googleVoiceToken: ''
  });
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>({
    isChecking: false,
    isValid: false,
    message: ''
  });
  const [voiceStatus, setVoiceStatus] = useState({
    isChecking: false,
    isSupported: false,
    message: ''
  });
  const [dialogueParams, setDialogueParams] = useState<DialogueParams>({
    place: '',
    topic: '',
    actor: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [possibleResponses, setPossibleResponses] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [userResponse, setUserResponse] = useState('');
  const [similarity, setSimilarity] = useState(0);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPlayingDialogue, setIsPlayingDialogue] = useState(false);


  const handleSettingsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
    setTokenStatus({ isChecking: false, isValid: false, message: '' });
  };

  const handlePlayDialogue = async () => {
    setIsPlayingDialogue(true);
    try {
      await speakDialogue(messages);
    } catch (error) {
      console.error('Error playing dialogue:', error);
      setError('Произошла ошибка при воспроизведении диалога');
    }
    setIsPlayingDialogue(false);
  };


  const handleDialogueParamsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setDialogueParams({ ...dialogueParams, [e.target.name]: e.target.value });
  };

  const handleCheckToken = async () => {
    setTokenStatus({ isChecking: true, isValid: false, message: '' });
    const isValid = await checkChatGPTToken(settings.chatGPTToken);
    setTokenStatus({
      isChecking: false,
      isValid,
      message: isValid ? 'Токен работает' : 'Неверный токен'
    });
  };

  const handleCheckVoiceSupport = async () => {
    setVoiceStatus({ isChecking: true, isSupported: false, message: '' });
    try {
      const recognition = startSpeechRecognition(
        () => {}, // onStart
        () => {}, // onResult
        () => {}  // onEnd
      );
      if (recognition) {
        recognition.stop();
        setVoiceStatus({
          isChecking: false,
          isSupported: true,
          message: 'Голосовые сервисы поддерживаются'
        });
      } else {
        throw new Error('Speech recognition not supported');
      }
    } catch (error) {
      setVoiceStatus({
        isChecking: false,
        isSupported: false,
        message: 'Голосовые сервисы не поддерживаются'
      });
    }
  };


  const startNewDialogue = async () => {
    if (!tokenStatus.isValid) {
      alert('Пожалуйста, проверьте токен ChatGPT перед началом диалога.');
      return;
    }
    setMessages([]);
    setScore(0);
    const initialMessage = `Здравствуйте, я ${dialogueParams.actor} в ${dialogueParams.place}. Чем могу помочь?`;
    setMessages([{ text: initialMessage, isUser: false }]);
    setIsSpeaking(true);
    await speakText(initialMessage);
    setIsSpeaking(false);
  };

  const sendMessage = useCallback(async () => {
    if (!userResponse.trim()) return;

    const newMessages = [...messages, { text: userResponse, isUser: true }];
    setMessages(newMessages);
    setUserResponse('');

    setIsGenerating(true);
    setError(null);
    try {
      const { response, possibleResponses } = await generateResponse(settings.chatGPTToken, newMessages, dialogueParams);
      setMessages([...newMessages, { text: response, isUser: false }]);
      setCurrentResponse(response);
      setPossibleResponses(possibleResponses);

      const similarityScore = calculateSimilarity(userResponse, possibleResponses);
      setSimilarity(similarityScore);
      setScore(prevScore => Math.min(5, prevScore + similarityScore / 20));

      setIsSpeaking(true);
      await speakText(response);
    } catch (error) {
      setError(`Ошибка при генерации ответа: ${(error as Error).message}`);
    } finally {
      setIsGenerating(false);
      setIsSpeaking(false);
    }
  }, [userResponse, messages, settings.chatGPTToken, dialogueParams]);


  const handleVoiceRecording = () => {
    console.log('handleVoiceRecording called');
    if (isRecording) {
      console.log('Stopping recording');
      setIsRecording(false);
      return;
    }
  
    console.log('Starting recording');
    setIsRecording(true);
    setError(null);
    const recognition = startSpeechRecognition(
      () => {
        console.log('Speech recognition started');
      },
      (text) => {
        console.log('Speech recognition result callback', text);
        setUserResponse(text);
        setIsRecording(false);
      },
      () => {
        console.log('Speech recognition end callback');
        setIsRecording(false);
      }
    );
  
    if (!recognition) {
      console.error('Failed to start speech recognition');
      setIsRecording(false);
      setError('Не удалось начать распознавание речи');
    } else {
      console.log('Speech recognition started successfully');
    }
  };

  


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    if (score >= 5) {
      alert('Поздравляем! Вы набрали максимальный балл!');
    }
  }, [score]);

  // Render functions
  const renderSettings = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Настройки
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs>
            <TextField
              fullWidth
              name="chatGPTToken"
              label="ChatGPT Token"
              value={settings.chatGPTToken}
              onChange={handleSettingsChange}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              onClick={handleCheckToken}
              disabled={tokenStatus.isChecking || !settings.chatGPTToken}
              color={tokenStatus.isValid ? "success" : "primary"}
            >
              {tokenStatus.isChecking ? 'Проверка...' : tokenStatus.isValid ? 'Работает' : 'Проверить'}
            </Button>
          </Grid>
        </Grid>
        {tokenStatus.message && (
          <Typography 
            color={tokenStatus.isValid ? "success" : "error"}
            sx={{ mt: 1 }}
          >
            {tokenStatus.message}
          </Typography>
        )}
        <Grid container spacing={2} alignItems="center" sx={{ mt: 2 }}>
          <Grid item xs>
            <Typography>Проверка голосовых сервисов</Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              onClick={handleCheckVoiceSupport}
              disabled={voiceStatus.isChecking}
              color={voiceStatus.isSupported ? "success" : "primary"}
            >
              {voiceStatus.isChecking ? 'Проверка...' : voiceStatus.isSupported ? 'Поддерживается' : 'Проверить'}
            </Button>
          </Grid>
        </Grid>
        {voiceStatus.message && (
          <Typography 
            color={voiceStatus.isSupported ? "success" : "error"}
            sx={{ mt: 1 }}
          >
            {voiceStatus.message}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  const renderNewDialogue = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Новый диалог
        </Typography>
        <TextField
          fullWidth
          name="place"
          label="Место"
          value={dialogueParams.place}
          onChange={handleDialogueParamsChange}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          name="topic"
          label="Тема"
          value={dialogueParams.topic}
          onChange={handleDialogueParamsChange}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          name="actor"
          label="Актер"
          value={dialogueParams.actor}
          onChange={handleDialogueParamsChange}
          sx={{ mb: 2 }}
        />
      </CardContent>
      <CardActions>
        <Button variant="contained" onClick={startNewDialogue} disabled={!tokenStatus.isValid}>
          Начать диалог
        </Button>
      </CardActions>
    </Card>
  );

  const renderCurrentDialogue = () => (
    <Card>
      <CardContent>
        <Typography variant="h5" component="h2" gutterBottom>
          Текущий диалог
        </Typography>
        <Paper style={{ maxHeight: 300, overflow: 'auto', marginBottom: 2, padding: 10 }}>
          <List>
            {messages.map((msg, index) => (
              <ListItem key={index} alignItems="flex-start" style={{ flexDirection: msg.isUser ? 'row-reverse' : 'row' }}>
                <ListItemText
                  primary={msg.text}
                  style={{ 
                    textAlign: msg.isUser ? 'right' : 'left',
                    backgroundColor: msg.isUser ? '#e3f2fd' : '#f1f1f1',
                    borderRadius: 10,
                    padding: 10,
                    display: 'inline-block',
                    maxWidth: '70%'
                  }}
                />
              </ListItem>
            ))}
          </List>
          {isGenerating && <CircularProgress />}
        </Paper>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {currentResponse && (
          <Typography variant="body1" gutterBottom>
            <strong>Ответ актера:</strong> {currentResponse}
          </Typography>
        )}
        {possibleResponses.length > 0 && (
          <>
            <Typography variant="body1" gutterBottom>
              <strong>Возможные ответы:</strong>
            </Typography>
            <List>
              {possibleResponses.map((response, index) => (
                <ListItem key={index}>
                  <ListItemText primary={`${index + 1}. ${response}`} />
                </ListItem>
              ))}
            </List>
          </>
        )}
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button
              variant="contained"
              startIcon={isRecording ? <Stop /> : <Mic />}
              onClick={handleVoiceRecording}
              color={isRecording ? "secondary" : "primary"}
              disabled={isSpeaking || !voiceStatus.isSupported}
            >
              {isRecording ? 'Остановить запись' : 'Начать запись'}
            </Button>
          </Grid>
          <Grid item xs>
            <TextField
              fullWidth
              label="Ваш ответ"
              value={userResponse}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setUserResponse(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isRecording || isSpeaking}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              endIcon={<Send />}
              onClick={sendMessage}
              disabled={isRecording || isSpeaking || isGenerating || !userResponse.trim()}
            >
              Отправить
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handlePlayDialogue}
              disabled={isPlayingDialogue || messages.length === 0}
            >
              Воспроизвести диалог
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
  


  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Диалоговое приложение
      </Typography>
      {renderSettings()}
      {renderNewDialogue()}
      {messages.length > 0 && renderCurrentDialogue()}
      {error && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          {error}
        </Alert>
      )}
      <Typography variant="h6" sx={{ mt: 2 }}>
        Схожесть ответа: {similarity}%
      </Typography>
      <Typography variant="h6">
        Текущий счет: {score.toFixed(2)}/5
      </Typography>
    </Container>
  );
};

export default DialogueApp;