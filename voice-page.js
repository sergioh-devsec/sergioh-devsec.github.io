import { mountPageVoice } from './page-voice.js?v=voice-36';
mountPageVoice({ initialKey: document.documentElement.lang === 'en' ? 'welcomeEn' : 'welcome2' });
