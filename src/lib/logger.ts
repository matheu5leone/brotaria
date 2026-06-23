import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'ai_requests.log');
const HISTORY_FILE = path.join(process.cwd(), 'historico_testes.json');

export function logAIRequest(type: 'LLM' | 'IMAGE', model: string, payload: any, response: any, status: number) {
  const timestamp = new Date().toISOString();
  
  // Truncate response if it's too long or HTML
  let displayResponse = typeof response === 'string' ? response : JSON.stringify(response);
  if (displayResponse.length > 1000) {
    if (displayResponse.includes('<!DOCTYPE html>') || displayResponse.includes('<html')) {
      displayResponse = `[HTML Response Truncated] - Status: ${status} - Starts with: ${displayResponse.substring(0, 100)}...`;
    } else {
      displayResponse = displayResponse.substring(0, 1000) + '... [TRUNCATED]';
    }
  }

  const logEntry = `
[${timestamp}] TYPE: ${type} | MODEL: ${model} | STATUS: ${status}
PAYLOAD: ${JSON.stringify(payload)}
RESPONSE: ${displayResponse}
--------------------------------------------------------------------------------
`;

  try {
    fs.appendFileSync(LOG_FILE, logEntry, 'utf8');
  } catch (err) {
    console.error('Failed to write to AI log file:', err);
  }
}

export function saveToLocalHistory(entry: {
  dna: any;
  stage: string;
  visualDescription: string;
  imageUrl: string;
  model: string;
}) {
  const timestamp = new Date().toISOString();
  const newEntry = { ...entry, timestamp };

  try {
    let history: any[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, 'utf8');
      history = JSON.parse(content);
    }
    history.unshift(newEntry); // Adiciona no início para ver os mais recentes primeiro
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save to local history:', err);
  }
}

export function getLocalHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Failed to read local history:', err);
  }
  return [];
}
