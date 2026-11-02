import { mountPageVoice } from './page-voice.js?v=voice-10';
mountPageVoice({ initialKey: document.documentElement.lang === 'en' ? 'welcomeEn' : 'welcome2' });
